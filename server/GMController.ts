import { Response } from 'express';
import { AuthenticatedRequest } from './GMMiddleware';
import { StorageEngine } from './StorageEngine';
import { AuthService } from './AuthService';

/**
 * Game Master / Admin 功能控制器
 * 必须使用 `requireAdmin` 中间件进行拦截
 */
export class GMController {
    /**
     * 1. 玩家查询接口
     * 根据 UID 获取玩家所有的明文存盘数据
     */
    static async queryPlayer(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const targetUid = req.body.targetUid || req.body.uid;
            if (!targetUid) {
                res.status(400).json({ error: '缺少 targetUid 参数' });
                return;
            }

            const playerData = await StorageEngine.readEncrypted(targetUid);
            if (!playerData) {
                res.status(404).json({ error: `目标玩家 [UID: ${targetUid}] 不存在` });
                return;
            }

            res.status(200).json({ success: true, data: playerData });
        } catch (error: any) {
            console.error('[GMController] queryPlayer execution failed:', error.message);
            res.status(500).json({ error: '读取玩家数据失败', details: error.message });
        }
    }

    /**
     * 2. 修改基础属性接口
     * 支持修改指定 UID 的 status、banReason、nickname、wallet.coins（禁止修改 UID）
     */
    static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const targetUid = req.body.targetUid || req.body.uid;
            const updates = req.body.updates || req.body;
            if (!targetUid || !updates || typeof updates !== 'object') {
                res.status(400).json({ error: '缺少 targetUid 参数或 updates 字段格式错误' });
                return;
            }

            if (req.user?.uid === targetUid && updates.status === 'banned') {
                res.status(403).json({ error: '管理员不能封禁自己' });
                return;
            }

            const playerData = await StorageEngine.readEncrypted(targetUid);
            if (!playerData) {
                res.status(404).json({ error: `目标玩家 [UID: ${targetUid}] 不存在` });
                return;
            }

            // 初始化基础结构
            if (!playerData.profile) playerData.profile = { uid: targetUid, nickname: `user_${targetUid}`, role: 'player', status: 'active', banReason: '', registerTime: Date.now() };
            if (!playerData.wallet) playerData.wallet = { coins: 0 };

            let isModified = false;

            // 处理 profile 修改
            if (updates.status !== undefined) {
                playerData.profile.status = updates.status;
                isModified = true;
            }
            if (updates.banReason !== undefined) {
                playerData.profile.banReason = updates.banReason;
                isModified = true;
            }
            if (updates.nickname !== undefined && typeof updates.nickname === 'string') {
                playerData.profile.nickname = updates.nickname;
                isModified = true;
            }
            
            // 处理钱包修改
            if (updates.wallet?.coins !== undefined && typeof updates.wallet.coins === 'number') {
                playerData.wallet.coins = Math.floor(updates.wallet.coins);
                isModified = true;
            }

            if (isModified) {
                await StorageEngine.writeEncrypted(targetUid, playerData);
                // 必须立刻调用同步更新索引的方法，确保全局索引库中的昵称被同步修改。
                if (updates.nickname !== undefined && typeof updates.nickname === 'string') {
                    await AuthService.updateNicknameInIndex(targetUid, updates.nickname);
                }
            }

            res.status(200).json({ success: true, message: '玩家资产更新成功', profile: playerData.profile, wallet: playerData.wallet });
        } catch (error: any) {
            console.error('[GMController] updateProfile execution failed:', error.message);
            res.status(500).json({ error: '更新玩家资产失败', details: error.message });
        }
    }

    /**
     * 3. 车辆 CRUD 聚合接口
     * 支持 add（发车）、update（修改等级耐久）、delete（删车）
     */
    static async manageVehicle(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const targetUid = req.body.targetUid || req.body.uid;
            const action = req.body.action;
            const vehicleId = req.body.vehicleId;
            const updates = req.body.updates || req.body;
            if (!targetUid || !action || !vehicleId) {
                res.status(400).json({ error: '缺少 targetUid, action 或 vehicleId 参数' });
                return;
            }

            const playerData = await StorageEngine.readEncrypted(targetUid);
            if (!playerData) {
                res.status(404).json({ error: `目标玩家 [UID: ${targetUid}] 不存在` });
                return;
            }

            if (!playerData.garage) playerData.garage = [];
            const vehicleIndex = playerData.garage.findIndex((v: any) => v.carId === vehicleId);

            if (action === 'add') {
                if (vehicleIndex >= 0) {
                    res.status(400).json({ error: '该车辆已存在，无法重复添加' });
                    return;
                }
                const newVehicle = {
                    carId: vehicleId,
                    level: updates?.level || 0,
                    durability: updates?.durability ?? 100,
                    isPermanent: updates?.isPermanent ?? true,
                    expireAt: updates?.expireAt || null,
                    equippedParts: updates?.equippedParts || { engine: null, tires: null, launch: null, drift: null, acceleration: null }
                };
                playerData.garage.push(newVehicle);
            } else if (action === 'update') {
                if (vehicleIndex < 0) {
                    res.status(404).json({ error: '未找到指定车辆' });
                    return;
                }
                const vehicle = playerData.garage[vehicleIndex];
                if (updates?.level !== undefined) vehicle.level = updates.level;
                if (updates?.durability !== undefined) vehicle.durability = updates.durability;
                if (updates?.isPermanent !== undefined) vehicle.isPermanent = updates.isPermanent;
                if (updates?.expireAt !== undefined) vehicle.expireAt = updates.expireAt;
            } else if (action === 'delete') {
                if (vehicleIndex < 0) {
                    res.status(404).json({ error: '未找到指定车辆' });
                    return;
                }
                playerData.garage.splice(vehicleIndex, 1);
            } else {
                res.status(400).json({ error: `不支持的 action: ${action}` });
                return;
            }

            await StorageEngine.writeEncrypted(targetUid, playerData);
            res.status(200).json({ success: true, message: `车辆 ${action} 操作成功`, garage: playerData.garage });
        } catch (error: any) {
            console.error('[GMController] manageVehicle execution failed:', error.message);
            res.status(500).json({ error: '车辆管理操作失败', details: error.message });
        }
    }

    /**
     * 4. 道具背包修改接口 (差值计算)
     * 传入 { materials: { core_primary: 10 }, parts: { engine_t1: -1 } } 进行差值计算
     */
    static async modifyInventory(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const targetUid = req.body.targetUid || req.body.uid;
            const delta = req.body.delta || req.body;
            if (!targetUid || !delta || typeof delta !== 'object') {
                res.status(400).json({ error: '缺少 targetUid 或差值更新对象 (delta)' });
                return;
            }

            const playerData = await StorageEngine.readEncrypted(targetUid);
            if (!playerData) {
                res.status(404).json({ error: `目标玩家 [UID: ${targetUid}] 不存在` });
                return;
            }

            if (!playerData.inventory) {
                playerData.inventory = { materials: {}, protectors: {}, parts: {}, paints: [] };
            }
            if (!playerData.inventory.materials) playerData.inventory.materials = {};
            if (!playerData.inventory.protectors) playerData.inventory.protectors = {};
            if (!playerData.inventory.parts) playerData.inventory.parts = {};

            // 预校验差值，确保扣除时数量充足
            const categories = ['materials', 'protectors', 'parts'];
            for (const category of categories) {
                if (delta[category]) {
                    for (const [key, diffStr] of Object.entries(delta[category])) {
                        const diff = Number(diffStr);
                        if (isNaN(diff)) continue;

                        const currentVal = playerData.inventory[category][key] || 0;
                        if (diff < 0 && currentVal + diff < 0) {
                            res.status(400).json({ error: `背包道具不足: [${category}] ${key} 余量为 ${currentVal}，无法扣除 ${Math.abs(diff)}` });
                            return;
                        }
                    }
                }
            }

            // 执行修改
            for (const category of categories) {
                if (delta[category]) {
                    for (const [key, diffStr] of Object.entries(delta[category])) {
                        const diff = Number(diffStr);
                        if (isNaN(diff)) continue;
                        
                        const currentVal = playerData.inventory[category][key] || 0;
                        playerData.inventory[category][key] = currentVal + diff;
                    }
                }
            }

            // 若涉及到 paints (paints 采用数组存储) 我们仅做演示：若不传暂时忽略，如果需要增发特定 string 推入即可。
            if (Array.isArray(delta.paints)) {
                delta.paints.forEach((paintId: string) => {
                    const idx = playerData.inventory.paints.indexOf(paintId);
                    // 假设传入带 "-" 前缀删，否则加。这只是个示例。
                    if (paintId.startsWith('-')) {
                        const actualId = paintId.slice(1);
                        const i = playerData.inventory.paints.indexOf(actualId);
                        if (i >= 0) playerData.inventory.paints.splice(i, 1);
                    } else {
                        if (idx < 0) playerData.inventory.paints.push(paintId);
                    }
                });
            }

            await StorageEngine.writeEncrypted(targetUid, playerData);
            res.status(200).json({ success: true, message: '背包更新成功', inventory: playerData.inventory });
        } catch (error: any) {
            console.error('[GMController] modifyInventory execution failed:', error.message);
            res.status(500).json({ error: '修改背包失败', details: error.message });
        }
    }

    /**
     * GM接口：强制重置玩家密码
     */
    static async resetUserPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const targetUid = req.body.targetUid || req.body.uid;
            const newPassword = req.body.newPassword;

            if (!targetUid || !newPassword) {
                res.status(400).json({ error: '缺少 targetUid 或 newPassword 参数' });
                return;
            }

            // 调用 AuthService 中新增的管理方法强制改密码
            await AuthService.adminResetPassword(targetUid, newPassword);

            res.status(200).json({ success: true, message: '密码重置成功' });
        } catch (error: any) {
            console.error('[GMController] resetUserPassword execution failed:', error.message);
            // 这里判断是否是因为找不到UID或者密码长度不符
            if (error.message.includes('找不到目标玩家') || error.message.includes('长度必须')) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: '重置密码失败', details: error.message });
            }
        }
    }
}
