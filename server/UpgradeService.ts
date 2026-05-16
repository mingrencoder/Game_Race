import { Response } from 'express';
import { AuthenticatedRequest } from './GMMiddleware';
import { StorageEngine } from './StorageEngine';
import { getVehicleTier } from './utils/vehicleUtils';
import { UPGRADE_CONFIG, SYS_CONFIG } from '../src/constants';

export class UpgradeService {
    static async upgradeCar(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const { carId, useProtectionCard = false } = req.body;
            if (!carId) { res.status(400).json({ error: 'Missing carId parameter' }); return; }

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) { res.status(404).json({ error: 'Player data not found' }); return; }

            if (!playerData.garage) playerData.garage = [];
            const vehicle = playerData.garage.find((v: any) => v.carId === carId);
            if (!vehicle) { res.status(404).json({ error: 'Vehicle not found' }); return; }

            const currentLevel = vehicle.level || 0;
            if (currentLevel >= SYS_CONFIG.MAX_UPGRADE_LEVEL) { res.status(400).json({ error: 'Vehicle is already at max level' }); return; }

            const config = UPGRADE_CONFIG[currentLevel];
            if (!config) { res.status(500).json({ error: 'Upgrade configuration missing for this level' }); return; }

            if (!playerData.inventory) playerData.inventory = { materials: {}, protectors: {}, parts: {}, paints: [] };
            if (!playerData.inventory.materials) playerData.inventory.materials = {};
            if (!playerData.inventory.protectors) playerData.inventory.protectors = {};

            const materialKey = config.material;
            const requiredCount = config.cost;

            if ((playerData.inventory.materials[materialKey] || 0) < requiredCount) {
                res.status(400).json({ error: `材料 ${config.materialName || materialKey} 不足 (需要 ${requiredCount} 个)` });
                return;
            }

            let protectionUsed = false;
            let protectionItem = null;
            if (useProtectionCard && config.protection) {
                if ((playerData.inventory.protectors[config.protection] || 0) >= 1) {
                    protectionUsed = true;
                    protectionItem = config.protection;
                } else {
                    res.status(400).json({ error: `保护卡 ${config.protectionName || config.protection} 不足` });
                    return;
                }
            }

            const tier = getVehicleTier(carId);
            const successRate = config.rate[tier] || 1.0;

            // 1. 无条件扣除材料（保护卡不保护材料，只保护等级）
            playerData.inventory.materials[materialKey] -= requiredCount;
            if (protectionUsed && config.protection) {
                playerData.inventory.protectors[config.protection] -= 1;
            }

            // 2. 玄学判定
            const isSuccess = Math.random() <= successRate;
            let message = '';

            if (isSuccess) {
                vehicle.level += 1;
                message = `强化成功！成功率 ${successRate * 100}%`;
            } else {
                message = `强化失败。(成功率 ${successRate * 100}%)`;
                if (!protectionUsed && config.failDrop > 0) {
                    vehicle.level = Math.max(0, vehicle.level - config.failDrop);
                    message += ` 遭受惩罚：下降至 +${vehicle.level}。`;
                } else if (protectionUsed) {
                    message += ` 保护卡生效，成功拦截了掉级惩罚！维持在 +${vehicle.level}。`;
                }
            }

            await StorageEngine.writeEncrypted(uid, playerData);

            res.json({
                success: true,
                isSuccess: isSuccess,
                message,
                carId,
                newLevel: vehicle.level,
                usedMaterial: materialKey,
                usedProtectionCard: protectionItem || 'none',
                playerData
            });
        } catch (error: any) {
            console.error('[UpgradeService] upgradeCar error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}