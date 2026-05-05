import { Response } from 'express';
import { AuthenticatedRequest } from './GMMiddleware';
import { StorageEngine } from './StorageEngine';

const SHOP_CONFIG = {
    cars: {
        'car_basic': { tier: 0, price: 0, rent: 0, repair: 0 },
        'nova_v1': { tier: 0, price: 0, rent: 0, repair: 0 },
        'car_t1_base': { tier: 1, price: 2000, rent: 600, repair: 30 }, // for debug testing matching HTML
        'pioneer_v1': { tier: 1, price: 2000, rent: 600, repair: 30 },
        'ghost_v1': { tier: 1, price: 2500, rent: 750, repair: 37 },
        'armor_v1': { tier: 1, price: 3000, rent: 900, repair: 45 },
        'ninja_v1': { tier: 2, price: 8000, rent: 2400, repair: 120 },
        'cyber_v1': { tier: 2, price: 12000, rent: 3600, repair: 180 },
        'lord_v1': { tier: 3, price: 80000, rent: 24000, repair: 1200 },
        'legend_v1': { tier: 3, price: 80000, rent: 24000, repair: 1200 }
    } as Record<string, any>,
    parts: {
        'engine_t1': { slot: 'engine', price: 300 },
        'engine_t2': { slot: 'engine', price: 2500 },
        'engine_t3': { slot: 'engine', price: 12000 },
        'tire_t1': { slot: 'tire', price: 300 },
        'tire_t2': { slot: 'tire', price: 2500 },
        'tire_t3': { slot: 'tire', price: 12000 },
        'startup_t1': { slot: 'startup', price: 400 },
        'startup_t2': { slot: 'startup', price: 3000 },
        'startup_t3': { slot: 'startup', price: 15000 },
        'drift_t1': { slot: 'drift', price: 400 },
        'drift_t2': { slot: 'drift', price: 3000 },
        'drift_t3': { slot: 'drift', price: 15000 },
        'accel_t1': { slot: 'acceleration', price: 500 },
        'accel_t2': { slot: 'acceleration', price: 3500 },
        'accel_t3': { slot: 'acceleration', price: 18000 }
    } as Record<string, any>
};

export class ShopController {
    
    static async buyCar(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const { carId, isPermanent } = req.body;
            if (!carId || typeof isPermanent !== 'boolean') {
                res.status(400).json({ error: 'Missing parameters' });
                return;
            }

            const carConfig = SHOP_CONFIG.cars[carId];
            if (!carConfig) {
                res.status(400).json({ error: 'Invalid carId' });
                return;
            }

            const cost = isPermanent ? carConfig.price : carConfig.rent;

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) { res.status(404).json({ error: 'Player data not found' }); return; }

            if (!playerData.wallet) playerData.wallet = { coins: 0 };
            if (playerData.wallet.coins < cost) {
                res.status(400).json({ error: `金币不足 (需要 ${cost} ⟁)` });
                return;
            }

            playerData.wallet.coins -= cost;

            if (!playerData.garage) playerData.garage = [];
            const existingCar = playerData.garage.find((c: any) => c.carId === carId);

            if (existingCar) {
                if (isPermanent) {
                    existingCar.isPermanent = true;
                    existingCar.expireAt = null;
                } else if (!existingCar.isPermanent) {
                    existingCar.expireAt = (existingCar.expireAt || Date.now()) + 30 * 24 * 60 * 60 * 1000;
                }
            } else {
                playerData.garage.push({
                    carId,
                    level: 0,
                    durability: 100,
                    isPermanent,
                    expireAt: isPermanent ? null : Date.now() + 30 * 24 * 60 * 60 * 1000,
                    equippedParts: { engine: null, tire: null, startup: null, drift: null, acceleration: null }
                });
            }

            await StorageEngine.writeEncrypted(uid, playerData);
            res.json({ success: true, message: 'Vehicle purchased successfully', carId, isPermanent, currentCoins: playerData.wallet.coins });
        } catch (error: any) {
            console.error('[ShopController] buyCar error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async buyPart(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const { partId } = req.body;
            if (!partId) { res.status(400).json({ error: 'Missing parameters' }); return; }

            const partConfig = SHOP_CONFIG.parts[partId];
            if (!partConfig) { res.status(400).json({ error: 'Invalid partId' }); return; }

            const cost = partConfig.price;

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) { res.status(404).json({ error: 'Player data not found' }); return; }

            if (!playerData.wallet) playerData.wallet = { coins: 0 };
            if (playerData.wallet.coins < cost) { res.status(400).json({ error: `金币不足 (需要 ${cost} ⟁)` }); return; }

            playerData.wallet.coins -= cost;
            
            if (!playerData.inventory) playerData.inventory = { materials: {}, protectors: {}, parts: {}, paints: [] };
            if (!playerData.inventory.parts) playerData.inventory.parts = {};

            playerData.inventory.parts[partId] = (playerData.inventory.parts[partId] || 0) + 1;

            await StorageEngine.writeEncrypted(uid, playerData);
            res.json({ success: true, message: '储备入库成功 (Added to inventory)', partId, currentCoins: playerData.wallet.coins, partsInventory: playerData.inventory.parts });
        } catch (error: any) {
            console.error('[ShopController] buyPart error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    
    static async equipPart(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            // partId: 可选，若为 null 则仅表示卸载
            const { carId, slotId, partId } = req.body;

            if (!carId || !slotId) { res.status(400).json({ error: 'Missing parameters' }); return; }

            const validSlots = ['engine', 'tire', 'startup', 'drift', 'acceleration'];
            if (!validSlots.includes(slotId)) { res.status(400).json({ error: 'Invalid slotId' }); return; }

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) { res.status(404).json({ error: 'Player data not found' }); return; }

            if (partId && (!playerData.inventory?.parts?.[partId] || playerData.inventory.parts[partId] <= 0)) {
                res.status(400).json({ error: '背包内无此闲置配件' }); return;
            }

            if (!playerData.garage) playerData.garage = [];
            const vehicle = playerData.garage.find((c: any) => c.carId === carId);
            if (!vehicle) { res.status(400).json({ error: 'Vehicle not found in garage' }); return; }
            if (!vehicle.equippedParts) vehicle.equippedParts = { engine: null, tire: null, startup: null, drift: null, acceleration: null };

            const oldPartId = vehicle.equippedParts[slotId];
            let unequipCost = 0;

            // 卸下旧零件 (20% 折损费规则) 
            // - PRD 指定：替换旧零件，或仅拆除旧零件，均需向系统支付旧零件原售价 20%
            if (oldPartId) {
                const oldPartConfig = SHOP_CONFIG.parts[oldPartId];
                if (oldPartConfig) {
                    unequipCost = Math.floor(oldPartConfig.price * 0.2);
                }
            }

            if (!playerData.wallet) playerData.wallet = { coins: 0 };
            if (unequipCost > 0 && playerData.wallet.coins < unequipCost) {
                res.status(400).json({ error: `金币不足，无法拆卸/替换零件 (需要支付系统折损费 ${unequipCost} ⟁)` });
                return;
            }

            // 执行扣费与置换
            if (unequipCost > 0) {
                playerData.wallet.coins -= unequipCost;
            }

            if (oldPartId) {
                if (!playerData.inventory.parts) playerData.inventory.parts = {};
                playerData.inventory.parts[oldPartId] = (playerData.inventory.parts[oldPartId] || 0) + 1;
            }

            if (partId) {
                playerData.inventory.parts[partId] -= 1; // 从闲置库存扣除
                vehicle.equippedParts[slotId] = partId; // 装配到身上
            } else {
                vehicle.equippedParts[slotId] = null; // 仅仅卸载
            }

            await StorageEngine.writeEncrypted(uid, playerData);
            res.json({
                success: true,
                message: partId ? '装配/替换成功' : '拆卸成功',
                carId, slotId, equippedPartId: partId, returnedPartId: oldPartId || null,
                unequipCost,
                currentCoins: playerData.wallet.coins,
                partsInventory: playerData.inventory.parts,
                vehicleParts: vehicle.equippedParts
            });
        } catch (error: any) {
            console.error('[ShopController] equipPart error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    
    static async repairCar(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const { carId } = req.body;
            if (!carId) { res.status(400).json({ error: 'Missing carId' }); return; }

            const carConfig = SHOP_CONFIG.cars[carId];
            if (!carConfig) { res.status(400).json({ error: 'Invalid carId' }); return; }

            const repairCost = carConfig.repair;

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) { res.status(404).json({ error: 'Player data not found' }); return; }

            if (!playerData.wallet) playerData.wallet = { coins: 0 };
            if (playerData.wallet.coins < repairCost) {
                res.status(400).json({ error: `支付大修费失败 (不足 ${repairCost} ⟁)` });
                return;
            }

            if (!playerData.garage) playerData.garage = [];
            const vehicle = playerData.garage.find((c: any) => c.carId === carId);
            if (!vehicle) { res.status(400).json({ error: 'Vehicle not found in garage' }); return; }

            playerData.wallet.coins -= repairCost;
            vehicle.durability = 100;

            await StorageEngine.writeEncrypted(uid, playerData);
            res.json({ success: true, message: 'Vehicle repaired successfully', currentDurability: 100, currentCoins: playerData.wallet.coins });
        } catch (error: any) {
            console.error('[ShopController] repairCar error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
