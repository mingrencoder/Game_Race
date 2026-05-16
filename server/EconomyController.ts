import { Response } from 'express';
import { AuthenticatedRequest } from './GMMiddleware';
import { StorageEngine } from './StorageEngine';

import { getVehicleTier } from './utils/vehicleUtils';
import { SYS_CONFIG } from '../src/constants';

const ECONOMY_CONFIG = {
    playersMult: { 1: 1.0, 2: 0.6, 3: 0.8, 4: 1.0, 5: 1.1, 6: 1.2 } as Record<number, number>,
    diffMult: { '入门': 0.8, '进阶': 1.0, '专家': 1.2, '专业': 1.5, '精英': 1.8 } as Record<string, number>,
    singleBase: { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8 } as Record<number, number>,
    durabilityLoss: { 0: 0, 1: 1, 2: 0.8, 3: 0.5 } as Record<number, number>
};

export class EconomyController {
    static async calculateRaceReward(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const {
                mode, // 'single' | 'team' | 'cup_single' | 'cup_team'
                carId,
                players = 1,
                difficulty = '进阶', // 默认进阶 1.0x
                rank,
                isTeamWin = false,
                isFlawless = false,
                isMVP = false,
                matches = 1, // 杯赛比赛场数
            } = req.body;

            if (!mode || !carId) {
                res.status(400).json({ error: 'Missing mode or carId' });
                return;
            }

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) {
                res.status(404).json({ error: 'Player data not found' });
                return;
            }

            if (!playerData.wallet) playerData.wallet = { coins: 0 };
            
            // 注：杯赛报名费已在 payCupEntryFee 接口前置扣除，此处无需再次扣费。
            let fee = 0;

            let coinDelta = 0;
            const pMult = ECONOMY_CONFIG.playersMult[players] || 1.0;
            const dMult = ECONOMY_CONFIG.diffMult[difficulty] || 1.0;

            if (mode === 'single' || mode === 'cup_single') {
                // 单人模式：不管是不是杯赛，单局结算都一样（如果有的话）。
                // 如果 rank 存在（没有 DNF）
                if (rank && rank >= 1 && rank <= 6) {
                    const base = ECONOMY_CONFIG.singleBase[rank];
                    coinDelta += Math.floor(base * pMult * dMult);
                }
            } else if (mode === 'team' || mode === 'cup_team') {
                // 组队模式：无基础名次低保，战败0收益
                if (isTeamWin) {
                    coinDelta += Math.floor(20 * pMult * dMult);
                    if (isFlawless) coinDelta += 10;
                    if (isMVP) coinDelta += 10;
                }
            }

            // 杯赛完赛大奖 (绝对固定的额外奖励，不吃人数难度乘数)
            if (mode === 'cup_single') {
                if (rank === 1) coinDelta += matches * 20;
                else if (rank === 2 || rank === 3) coinDelta += matches * 10;
            } else if (mode === 'cup_team') {
                if (isTeamWin) coinDelta += matches * 15;
                if (isMVP) coinDelta += matches * 10;
            }

            playerData.wallet.coins += coinDelta;

            // 扣除车辆耐久度
            const tier = getVehicleTier(carId);
            const loss = ECONOMY_CONFIG.durabilityLoss[tier];
            
            let currentDurability = SYS_CONFIG.MAX_DURABILITY;
            if (playerData.garage && Array.isArray(playerData.garage)) {
                const vehicle = playerData.garage.find((v: any) => v.carId === carId);
                if (vehicle) {
                    vehicle.durability = Math.max(0, vehicle.durability - loss);
                    currentDurability = vehicle.durability;
                }
            }

            await StorageEngine.writeEncrypted(uid, playerData);

            res.json({
                success: true,
                feePaid: fee,
                earnedCoins: coinDelta,
                currentCoins: playerData.wallet.coins,
                vehicleState: {
                    carId,
                    durabilityLoss: loss,
                    currentDurability
                },
                playerData
            });

        } catch (error: any) {
             console.error('[EconomyController] calculateRaceReward error:', error);
             res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * 杯赛入场扣费（仅报名费）
     */
    static async payCupEntryFee(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const { cupTracksCount } = req.body;
            if (!cupTracksCount || typeof cupTracksCount !== 'number') {
                res.status(400).json({ error: 'Missing or invalid cupTracksCount' });
                return;
            }

            const fee = cupTracksCount * 10;

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) { res.status(404).json({ error: 'Player data not found' }); return; }

            if (!playerData.wallet) playerData.wallet = { coins: 0 };
            if (playerData.wallet.coins < fee) {
                res.status(400).json({ error: '金币不足，无法支付杯赛报名费' });
                return;
            }

            playerData.wallet.coins -= fee;

            await StorageEngine.writeEncrypted(uid, playerData);

            res.json({
                success: true,
                feePaid: fee,
                coins: playerData.wallet.coins,
                wallet: playerData.wallet,
                playerData
            });

        } catch (error: any) {
            console.error('[EconomyController] payCupEntryFee error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * 杯赛夺冠结算
     */
    static async settleCup(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) { res.status(404).json({ error: 'Player data not found' }); return; }

            if (!playerData.wallet) playerData.wallet = { coins: 0 };
            
            // Basic simplistic reward, you can extend this
            const reward = 50; 
            playerData.wallet.coins += reward;

            await StorageEngine.writeEncrypted(uid, playerData);

            res.json({
                success: true,
                coins: playerData.wallet.coins,
                playerData
            });
        } catch (error: any) {
            console.error('[EconomyController] settleCup error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
