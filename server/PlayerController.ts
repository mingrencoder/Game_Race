import { Response } from 'express';
import { AuthenticatedRequest } from './GMMiddleware';
import { StorageEngine } from './StorageEngine';
import { AuthService } from './AuthService';

export class PlayerController {
    /**
     * 获取当前登录玩家的完整个人信息与资产数据
     */
    static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            // 1. 从 JWT 解析后的 req.user 中获取当前玩家的 UID
            const uid = req.user?.uid;
            if (!uid) {
                res.status(401).json({ error: '未授权或身份已过期' });
                return;
            }

            // 2. 底层读取玩家在文件系统中的专属加密数据
            const playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) {
                res.status(404).json({ error: '未能找到该玩家的存档数据' });
                return;
            }

            // 3. 数据清洗，提取我们需要展示给前端的核心基础数据模块
            // 当某些模块在早前存档可能没有时，给予空值兜底以防前端解构取值报错
            const profile = playerData.profile || { uid, nickname: `user_${uid}`, role: 'player', status: 'active', banReason: '', registerTime: Date.now() };
            const garage = playerData.garage || [];
            
            // 如果玩家拥有车辆但没有设置 activeCarId，自动装备第一辆车
            if (!profile.activeCarId && garage.length > 0) {
                profile.activeCarId = garage[0].carId;
                await StorageEngine.writeEncrypted(uid, { ...playerData, profile, garage });
            }

            const responseData = {
                profile: profile,
                wallet: playerData.wallet || { coins: 0 },
                garage: garage,
                inventory: playerData.inventory || { materials: {}, protectors: {}, parts: {}, paints: [] }
            };

            // 4. 返回清洗后的脱敏 / 有效负载
            res.status(200).json({
                success: true,
                data: responseData
            });

        } catch (error: any) {
            console.error('[PlayerController] getProfile 执行失败:', error.message);
            res.status(500).json({ error: '服务器内部获取玩家信息失败', details: error.message });
        }
    }

    /**
     * 玩家自助修改昵称
     */
    static async updateNickname(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            const newNickname = req.body.newNickname;

            if (!uid) {
                res.status(401).json({ error: '未授权或身份已过期' });
                return;
            }

            if (!newNickname || typeof newNickname !== 'string' || newNickname.length < 2 || newNickname.length > 20) {
                res.status(400).json({ error: '昵称不合法（需 2-20 个字符）' });
                return;
            }

            // 1. 获取存档并修改
            const playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData || !playerData.profile) {
                res.status(404).json({ error: '未能找到该玩家的存档数据' });
                return;
            }

            if (!playerData.inventory?.specialItems?.rename_card || playerData.inventory.specialItems.rename_card <= 0) {
                res.status(400).json({ error: '改名卡不足' });
                return;
            }

            playerData.profile.nickname = newNickname;
            playerData.inventory.specialItems.rename_card -= 1;
            
            await StorageEngine.writeEncrypted(uid, playerData);

            // 2. 双写：立刻调用AuthService更新全部记录中的索引
            await AuthService.updateNicknameInIndex(uid, newNickname);

            res.status(200).json({ success: true, nickname: newNickname, message: '修改昵称成功' });
        } catch (error: any) {
            console.error('[PlayerController] updateNickname 失败:', error.message);
            if (error.message.includes('新昵称已被注册')) {
                res.status(400).json({ error: '新昵称已被其他玩家使用' });
                return;
            }
            res.status(500).json({ error: '服务器内部修改昵称失败', details: error.message });
        }
    }

    /**
     * 玩家自助修改密码
     */
    static async updatePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            const oldPassword = req.body.oldPassword;
            const newPassword = req.body.newPassword;

            if (!uid) {
                res.status(401).json({ error: '未授权或身份已过期' });
                return;
            }

            if (!oldPassword || !newPassword) {
                res.status(400).json({ error: '缺少原密码或新密码参数' });
                return;
            }

            // 调用 AuthService 进行密码比对与修改
            await AuthService.playerChangePassword(uid, oldPassword, newPassword);

            res.status(200).json({ success: true, message: '密码修改成功，请妥善保管新密码' });
        } catch (error: any) {
            console.error('[PlayerController] updatePassword 失败:', error.message);
            if (error.message.includes('原密码错误') || error.message.includes('长度必须')) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: '服务器内部修改密码失败', details: error.message });
            }
        }
    }

    /**
     * 设置玩家当前出战的车辆
     */
    static async setActiveCar(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const { carId } = req.body;
            if (!carId) { res.status(400).json({ error: 'Missing carId' }); return; }

            await StorageEngine.transaction(uid, async (data) => {
                if (!data.garage) data.garage = [];
                const vehicle = data.garage.find((v: any) => v.carId === carId);

                if (!vehicle) {
                    throw new Error('车辆未拥有/车库中不存在');
                }

                if (!vehicle.isPermanent && vehicle.expireAt && vehicle.expireAt < Date.now()) {
                    throw new Error('该车辆租赁已过期，无法出战');
                }

                if (!data.profile) {
                    data.profile = { uid, nickname: `user_${uid}`, role: 'player', status: 'active', banReason: '', registerTime: Date.now() };
                }

                data.profile.activeCarId = carId;
            });

            res.json({ success: true, message: '出战车辆设置成功', activeCarId: carId });
        } catch (error: any) {
            console.error('[PlayerController] setActiveCar error:', error);
            res.status(error.message.includes('未拥有') || error.message.includes('已过期') ? 400 : 500)
                .json({ error: error.message || 'Internal Server Error' });
        }
    }
}
