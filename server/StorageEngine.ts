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

// 简单的写入锁机制，防止并发覆盖导致 JSON 损坏
const writeLocks = new Set<string>();

async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

export class StorageEngine {
    /**
     * 加密写入数据到文件系统
     * @param uid 玩家唯一标识
     * @param dataObject 要保存的数据对象
     */
    static async writeEncrypted(uid: string, dataObject: any): Promise<void> {
        const filePath = path.join(DATA_DIR, `UID_${uid}.json`);
        
        // 简单的自旋等待锁释放
        while (writeLocks.has(uid)) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // 加锁
        writeLocks.add(uid);
        
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
        } finally {
            // 释放锁
            writeLocks.delete(uid);
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
}
