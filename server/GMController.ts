import { Response } from 'express';
import { AuthenticatedRequest } from './GMMiddleware';
import { StorageEngine } from './StorageEngine';

/**
 * Game Master / Admin 功能控制器
 */
export class GMController {
    /**
     * GM指令：一键将玩家某赛车升至5级，并装备完整的高级（T3）全散件
     * 路由需要使用 `requireAdmin` 中间件进行拦截
     */
    static async overrideGarage(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            // 前端需要提供目标用户的UID，以及想要修改的车辆ID
            const { targetUid, vehicleId } = req.body;

            if (!targetUid || !vehicleId) {
                res.status(400).json({ error: 'Missing targetUid or vehicleId parameter' });
                return;
            }

            // 1. 读取对应玩家加密存档
            let playerData = null;
            try {
                playerData = await StorageEngine.readEncrypted(targetUid);
            } catch (err: any) {
                console.error(`读取数据失败 [UID: ${targetUid}]: ${err.message}`);
                res.status(500).json({ error: 'Failed to read user data or data corrupted.' });
                return;
            }

            if (!playerData) {
                res.status(404).json({ error: 'Target user not found or has no init data.' });
                return;
            }

            // 2. 在玩家内存数据中寻找特定的赛车对象
            // 假设存档格式 garage 只是一个 vehicle 数组
            if (!Array.isArray(playerData.garage)) {
                playerData.garage = [];
            }

            let vehicle = playerData.garage.find((v: any) => v.id === vehicleId);

            // 若车库无此车，我们可以强制塞入一辆
            if (!vehicle) {
                vehicle = { id: vehicleId, name: `Custom Vehicle ${vehicleId}` };
                playerData.garage.push(vehicle);
            }

            // 3. 核心覆写：暴力注入等级为5，并强行提供全套 T3 极品配件
            vehicle.level = 5;
            
            // 构造 T3 完整配件对象
            const t3PartsSet = {
                engine: { id: 'eng_t3_001', name: 'V12 Twin Turbo', tier: 3, stats: { speed: 100, accel: 80 } },
                tires: { id: 'tir_t3_001', name: 'Racing Slicks Pro', tier: 3, stats: { grip: 95 } },
                nitro: { id: 'nit_t3_001', name: 'N²O Stage III', tier: 3, stats: { boost: 120, duration: 5 } },
                frame: { id: 'frm_t3_001', name: 'Carbon Fiber Chassis', tier: 3, stats: { weight: -50, durability: 300 } }
            };

            vehicle.equippedParts = t3PartsSet;

            // 4. 将被修改的用户数据重新落盘
            await StorageEngine.writeEncrypted(targetUid, playerData);

            res.status(200).json({ 
                success: true, 
                message: `Successfully overridden vehicle ${vehicleId} for UID ${targetUid} with T3 parts!`,
                vehicleState: vehicle
            });
            
        } catch (error: any) {
            console.error('[GMController] overrideGarage execution failed:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
