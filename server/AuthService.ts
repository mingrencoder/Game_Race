import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';
import { StorageEngine } from './StorageEngine';

const DATA_DIR = path.join(process.cwd(), 'data');
const ACCOUNTS_INDEX_FILE = path.join(DATA_DIR, 'accounts_index.json');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

// Memory cache for mapped accounts
let accountsCache: Record<string, any> = {};
let nextUid = 10000000;
let isInitialized = false;
let authLock = false;

async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

/**
 * 账号与索引服务层
 */
export class AuthService {
    /**
     * 启动时 Bootstrap，加载现有账号和索引，
     * 并确保系统级管理员账号及配套的加密文件存在。
     */
    static async bootstrap() {
        await ensureDataDir();

        // 1. 加载发号器索引
        try {
            const indexData = await fs.readFile(ACCOUNTS_INDEX_FILE, 'utf8');
            nextUid = JSON.parse(indexData).nextUid;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                // 如果没有，初始化为 10000000
                nextUid = 10000000;
                await fs.writeFile(ACCOUNTS_INDEX_FILE, JSON.stringify({ nextUid }), 'utf8');
            }
        }

        // 2. 加载或初始化全服账号映射表，使用内存缓存
        try {
            const accountsData = await fs.readFile(ACCOUNTS_FILE, 'utf8');
            accountsCache = JSON.parse(accountsData);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                accountsCache = {};
                await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accountsCache), 'utf8');
            }
        }

        // 3. 注入系统管理员 admin / pop1993
        if (!accountsCache['admin']) {
            console.log('[AuthService] 正在初始化 admin 账号...');
            const adminUid = nextUid.toString();
            nextUid++;
            await fs.writeFile(ACCOUNTS_INDEX_FILE, JSON.stringify({ nextUid }), 'utf8');

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('pop1993', salt);

            // 注册 admin 账号信息
            accountsCache['admin'] = {
                uid: adminUid,
                passwordHash: passwordHash,
                role: 'admin' // 保留给 GM 权限的标识符
            };
            await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accountsCache, null, 2), 'utf8');

            // 为管理员账号初始化加密数据文件
            const adminData = {
                profile: {
                    uid: adminUid,
                    nickname: 'admin',
                    role: 'admin',
                    status: 'active',
                    banReason: '',
                    registerTime: Date.now()
                },
                wallet: { coins: 9999999 },
                garage: [],
                inventory: {
                    materials: {},
                    protectors: {},
                    parts: {},
                    paints: []
                }
            };
            await StorageEngine.writeEncrypted(adminUid, adminData);
            console.log(`[AuthService]  admin 初始化完成，UID: ${adminUid}`);
        }

        isInitialized = true;
    }

    /**
     * 注册逻辑
     */
    static async register(username: string, passwordPlain: string) {
        if (!isInitialized) await this.bootstrap();

        // 使用简单锁防并发导致的数据覆盖
        while (authLock) {
            await new Promise(r => setTimeout(r, 10));
        }
        authLock = true;

        try {
            if (accountsCache[username]) {
                throw new Error("用户名已被注册");
            }

            const newUid = nextUid.toString();
            nextUid++;
            
            // 头一步：写索引表
            await fs.writeFile(ACCOUNTS_INDEX_FILE, JSON.stringify({ nextUid }), 'utf8');

            // 准备 hash 
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(passwordPlain, salt);

            accountsCache[username] = {
                uid: newUid,
                passwordHash,
                role: 'user'
            };
            // 落盘
            await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accountsCache, null, 2), 'utf8');

            // 为新用户创建基础空数据
            const initData = {
                profile: {
                    uid: newUid,
                    nickname: username,
                    role: 'player',
                    status: 'active',
                    banReason: '',
                    registerTime: Date.now()
                },
                wallet: { coins: 0 },
                garage: [],
                inventory: {
                    materials: {},
                    protectors: {},
                    parts: {},
                    paints: []
                }
            };
            await StorageEngine.writeEncrypted(newUid, initData);

            return { uid: newUid, username, role: 'user' };
        } finally {
            authLock = false; // 释放锁
        }
    }

    /**
     * 登录校验
     * @returns 成功返回用户信息，失败抛出错误
     */
    static async login(username: string, passwordPlain: string) {
        if (!isInitialized) await this.bootstrap();
        
        const accountInfo = accountsCache[username];
        if (!accountInfo) {
            throw new Error("账号不存在");
        }

        const isMatch = await bcrypt.compare(passwordPlain, accountInfo.passwordHash);
        if (!isMatch) {
            throw new Error("密码错误");
        }

        const playerData = await StorageEngine.readEncrypted(accountInfo.uid);

        // 旧存档兜底兼容
        if (playerData && playerData.profile) {
            if (!playerData.profile.role) {
                playerData.profile.role = accountInfo.role === 'admin' ? 'admin' : 'player';
            }
            if (!playerData.profile.status) {
                playerData.profile.status = 'active';
            }
            if (playerData.profile.banReason === undefined) {
                playerData.profile.banReason = '';
            }
        }

        if (playerData?.profile?.status === 'banned') {
            throw new Error(`账号已封禁，原因：${playerData.profile.banReason}`);
        }

        return {
            uid: accountInfo.uid,
            username: username,
            role: playerData?.profile?.role || accountInfo.role
        };
    }
}
