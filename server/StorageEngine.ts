import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const DATA_DIR = path.join(process.cwd(), 'data');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error('CRITICAL: ENCRYPTION_KEY environment variable is missing or invalid. Must be 64-character hex string.');
    process.exit(1);
}

// 解析 key 为 buffer，如果长度不足或超过 32 bytes，在 createCipheriv 时会报错。这里使用 sha256 确保正好是 32 byte
const KEY_BUFFER = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();

// 真正的异步互斥锁队列，保证读改写(Read-Modify-Write)的原子性
const lockQueues = new Map<string, Promise<void>>();

async function acquireLock(key: string): Promise<() => void> {
    const currentQueue = lockQueues.get(key) || Promise.resolve();
    let release!: () => void;
    const nextQueue = new Promise<void>(resolve => { release = resolve; });
    lockQueues.set(key, currentQueue.then(() => nextQueue));
    await currentQueue;
    return () => {
        release();
        if (lockQueues.get(key) === nextQueue) {
            lockQueues.delete(key);
        }
    };
}

async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

export class StorageEngine {

    /**
     * 对特定资源申请互斥锁，并在获得锁后执行操作
     */
    static async runLocked<T>(key: string, operation: () => Promise<T>): Promise<T> {
        const release = await acquireLock(key);
        try {
            return await operation();
        } finally {
            release();
        }
    }

    /**
     * 为玩家数据提供包裹事务：自动加锁 -> 读取 -> 被回调修改 -> 写入 -> 解锁
     */
    static async transaction(uid: string, operator: (data: any) => Promise<boolean | void>): Promise<void> {
        await this.runLocked(`UID_${uid}`, async () => {
            const data = await this.readEncrypted(uid);
            if (!data) throw new Error(`Player data not found for UID: ${uid}`);
            const shouldSave = await operator(data);
            if (shouldSave !== false) {
                await this._writeEncryptedInternal(uid, data);
            }
        });
    }

    /**
     * 加密写入数据到文件系统 (带有独立的锁保护)
     * @param uid 玩家唯一标识
     * @param dataObject 要保存的数据对象
     */
    static async writeEncrypted(uid: string, dataObject: any): Promise<void> {
        await this.runLocked(`UID_${uid}`, async () => {
            await this._writeEncryptedInternal(uid, dataObject);
        });
    }

    private static async _writeEncryptedInternal(uid: string, dataObject: any): Promise<void> {
        const filePath = path.join(DATA_DIR, `UID_${uid}.json`);
        try {
            await ensureDataDir();
            const payload = JSON.stringify(dataObject);
            
            // 生成随机的 Initial Vector (GCM推荐12字节长度)
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv('aes-256-gcm', KEY_BUFFER, iv);
            
            let encrypted = cipher.update(payload, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // 获取身份验证标签，确保数据完整性
            const authTag = cipher.getAuthTag();
            
            // 组装格式: iv:authTag:ciphertext (全十六进制存储)
            const fileContent = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
            
            // 直接写入
            await fs.writeFile(filePath, fileContent, 'utf8');
        } catch (error) {
            console.error(`[Storage Engine] 写入 UID ${uid} 数据时发生异常:`, error);
            throw error;
        }
    }

    /**
     * 读取并解密玩家数据
     * @param uid 玩家唯一标识
     * @returns 解密后的数据对象，如果不存在则返回 null
     */
    static async readEncrypted(uid: string): Promise<any> {
        const filePath = path.join(DATA_DIR, `UID_${uid}.json`);
        try {
            const raw = await fs.readFile(filePath, 'utf8');
            const parts = raw.split(':');
            
            if (parts.length !== 3) {
                throw new Error("Invalid encrypted file format.");
            }
            
            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encrypted = parts[2];
            
            const decipher = crypto.createDecipheriv('aes-256-gcm', KEY_BUFFER, iv);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);
        } catch (error: any) {
            // ENOENT = 文件未找到，对于新账号是正常情况
            if (error.code === 'ENOENT') {
                return null;
            }
            // 捕获解密异常 (如 authTag 校验失败表示数据被篡改)
            console.error(`[Security Alert] 账号 ${uid} 数据解密失败，可能被篡改或损坏！`, error.message);
            throw new Error('解密失败或数据损坏');
        }
    }

    /**
     * 读取全局排行榜
     * @returns 排行榜数据对象
     */
    static async readLeaderboard(): Promise<any> {
        const filePath = path.join(DATA_DIR, 'leaderboard.json');
        try {
            const raw = await fs.readFile(filePath, 'utf8');
            return JSON.parse(raw);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return {};
            }
            console.error(`[Storage Engine] 读取排行榜失败`, error);
            throw error;
        }
    }

    /**
     * 写入全局排行榜 (内部方法，外部需调用带锁或者保证有锁)
     * @param dataObject 要保存的排行榜数据对象
     */
    private static async _writeLeaderboardInternal(dataObject: any): Promise<void> {
        const filePath = path.join(DATA_DIR, 'leaderboard.json');
        try {
            await ensureDataDir();
            const payload = JSON.stringify(dataObject, null, 2);
            await fs.writeFile(filePath, payload, 'utf8');
        } catch (error) {
            console.error(`[Storage Engine] 写入排行榜数据发生异常:`, error);
            throw error;
        }
    }

    /**
     * 读取并写入排行榜（完整事务包裹）
     */
    static async leaderboardTransaction(operator: (board: any) => Promise<boolean | void>): Promise<void> {
        await this.runLocked('GLOBAL_LEADERBOARD', async () => {
            const board = await this.readLeaderboard();
            const shouldSave = await operator(board);
            if (shouldSave !== false) {
                await this._writeLeaderboardInternal(board);
            }
        });
    }

    /**
     * 写入全局排行榜
     * @param dataObject 要保存的排行榜数据对象
     */
    static async writeLeaderboard(dataObject: any): Promise<void> {
        await this.runLocked('GLOBAL_LEADERBOARD', async () => {
            await this._writeLeaderboardInternal(dataObject);
        });
    }

    /**
     * 清空指定赛道和圈数的全网在线记录
     * @param trackId 赛道ID
     * @param laps 圈数
     */
    static async deleteTrackRecords(trackId: string, laps: number): Promise<void> {
        await this.leaderboardTransaction(async (board) => {
            const key = `${trackId}_${laps}`;
            if (board[key]) {
                delete board[key];
            }
        });
    }

    /**
     * 提交赛道成绩，保证原子读改写操作
     * @param trackId 赛道ID
     * @param laps 圈数
     * @param recordData 成绩对象
     */
    static async submitRecord(trackId: string, laps: number, recordData: { uid: string; playerName: string; time: number; vehicle: string; isTeam: boolean; timestamp: number }): Promise<void> {
        await this.leaderboardTransaction(async (board) => {
            const key = `${trackId}_${laps}`;
            if (!board[key]) board[key] = [];
            
            board[key].push(recordData);
            // 按时间从小到大（从快到慢）排序
            board[key].sort((a: any, b: any) => a.time - b.time);
            
            // 只保留前 50 名
            if (board[key].length > 50) {
                board[key] = board[key].slice(0, 50);
            }
        });
    }

    /**
     * 获取指定赛道和圈数的前 50 成绩
     * @param trackId 赛道ID
     * @param laps 圈数
     * @returns 成绩数组
     */
    static async getRecords(trackId: string, laps: number): Promise<any[]> {
        const board = await this.readLeaderboard();
        const key = `${trackId}_${laps}`;
        return board[key] || [];
    }
}
