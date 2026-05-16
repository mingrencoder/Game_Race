import { Request, Response } from 'express';
import { StorageEngine } from './StorageEngine';

// 注意：本项目使用 ES Modules (package.json 中 "type": "module")
// 不能使用 const fs = require('fs')。如需文件操作，请在文件顶部 import fs from 'fs/promises'。

interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;
        role: string;
    };
}

export class LeaderboardController {
    /**
     * 提交成绩
     */
    static async submit(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            console.log('[Leaderboard] submit attempt:', req.body, req.user);
            const uid = req.user?.uid;
            if (!uid) {
                console.error('[Leaderboard] Missing uid');
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { trackId, laps, time, vehicle, isTeam } = req.body;
            if (!trackId || typeof laps !== 'number' || typeof time !== 'number' || !vehicle) {
                console.error('[Leaderboard] Missing params:', {trackId, laps, time, vehicle});
                res.status(400).json({ error: 'Missing or invalid parameters' });
                return;
            }

            const playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) {
                console.error('[Leaderboard] Player missing:', uid);
                res.status(404).json({ error: 'Player data not found' });
                return;
            }

            const playerName = playerData.profile?.nickname || `user_${uid}`;

            const recordData = {
                uid,
                playerName,
                time,
                vehicle,
                isTeam: !!isTeam,
                timestamp: Date.now()
            };
            
            console.log('[Leaderboard] Record to save:', recordData);

            const result = await StorageEngine.submitRecord(trackId, laps, recordData);

            res.json({ success: true, message: '成绩提交成功', isTopRecord: result.isTopRecord, previousTopTime: result.previousTopTime, topRecord: result.topRecord });
        } catch (error: any) {
            console.error('[LeaderboardController] submit error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * 获取指定赛道和圈数的前 50 成绩
     */
    static async getTopRecords(req: Request, res: Response): Promise<void> {
        try {
            const { trackId, laps } = req.params;
            if (!trackId || !laps) {
                res.status(400).json({ error: 'Missing trackId or laps' });
                return;
            }

            const lapsNum = parseInt(laps, 10);
            if (isNaN(lapsNum)) {
                res.status(400).json({ error: 'Invalid laps parameter' });
                return;
            }

            const records = await StorageEngine.getRecords(trackId, lapsNum);

            res.json({ success: true, records });
        } catch (error: any) {
            console.error('[LeaderboardController] getTopRecords error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
