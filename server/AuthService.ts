import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';
import { StorageEngine } from './StorageEngine';
import { SYS_CONFIG } from '../src/constants';

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
                    specialItems: { rename_card: 0 },
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
                role: 'player'
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
                    activeCarId: 'car_basic',
                    banReason: '',
                    registerTime: Date.now()
                },
                wallet: { coins: 0 },
                garage: [
                    {
                        carId: 'car_basic',
                        level: 0,
                        durability: SYS_CONFIG.MAX_DURABILITY,
                        isPermanent: true,
                        expireAt: null,
                        equippedParts: {
                            engine: null,
                            tires: null,
                            launch: null,
                            drift: null,
                            acceleration: null
                        },
                        equippedPaint: null
                    }
                ],
                inventory: {
                    materials: {},
                    protectors: {},
                    specialItems: { rename_card: 0 },
                    parts: {},
                    paints: []
                }
            };
            await StorageEngine.writeEncrypted(newUid, initData);

            return { uid: newUid, username, role: 'player' };
        } finally {
            authLock = false; // 释放锁
        }
    }

    /**
     * 登录校验
     * @returns 成功返回用户信息，失败抛出错误
     */
    static async login(identifier: string, passwordPlain: string) {
        if (!isInitialized) await this.bootstrap();
        
        let accountInfo = null;
        let actualUsername = null;

        // 1. 作为 UID 查找 (8位数字或系统内部保留uid)
        if (/^\d{8}$/.test(identifier) || identifier === 'admin') {
            for (const [uname, info] of Object.entries(accountsCache)) {
                if (info.uid === identifier) {
                    accountInfo = info;
                    actualUsername = uname;
                    break;
                }
            }
        }

        // 2. 作为 username (nickname) 查找
        if (!accountInfo) {
            accountInfo = accountsCache[identifier];
            actualUsername = identifier;
        }

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
            username: actualUsername,
            role: playerData?.profile?.role || accountInfo.role
        };
    }

    /**
     * 同步更新全局账户索引中的昵称
     */
    static async updateNicknameInIndex(uid: string, newNickname: string) {
        if (!isInitialized) await this.bootstrap();

        // 查找对应的老昵称（即 accountsCache 的 key）
        let oldUsername = null;
        for (const [uname, info] of Object.entries(accountsCache)) {
            if (info.uid === uid) {
                oldUsername = uname;
                break;
            }
        }

        if (oldUsername && oldUsername !== newNickname) {
            // 防止新昵称已经存在
            if (accountsCache[newNickname]) {
                throw new Error("新昵称已被注册");
            }
            
            // 迁移数据
            accountsCache[newNickname] = accountsCache[oldUsername];
            delete accountsCache[oldUsername];
            
            // 落盘
            await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accountsCache, null, 2), 'utf8');
        }
    }

    /**
     * 将输入的 identifier (UID 或昵称) 解析为实际 UID
     */
    static async resolveUid(identifier: string): Promise<string | null> {
        if (!isInitialized) await this.bootstrap();
        
        // 1. 作为 UID 查找
        if (/^\d{8}$/.test(identifier) || identifier === 'admin') {
            for (const info of Object.values(accountsCache)) {
                if (info.uid === identifier) {
                    return identifier;
                }
            }
        }

        // 2. 作为 username (nickname) 查找
        if (accountsCache[identifier]) {
            return accountsCache[identifier].uid;
        }

        // 如果找不到，返回原值尝试
        return identifier;
    }

    /**
     * GM接口专用：强制重置玩家密码
     * @param targetUid 目标玩家 UID
     * @param newPasswordPlain 新密码明文
     */
    static async adminResetPassword(targetUid: string, newPasswordPlain: string): Promise<void> {
        if (!isInitialized) await this.bootstrap();

        // 校验密码长度
        if (!newPasswordPlain || newPasswordPlain.length < 6 || newPasswordPlain.length > 16) {
            throw new Error('新密码长度必须在 6 到 16 个字符之间');
        }

        // 查找对应的账号记录
        let targetUsername = null;
        for (const [uname, info] of Object.entries(accountsCache)) {
            if (info.uid === targetUid) {
                targetUsername = uname;
                break;
            }
        }

        if (!targetUsername) {
            throw new Error(`找不到目标玩家 [UID: ${targetUid}]`);
        }

        // 使用 bcrypt 重新计算新密码的哈希
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPasswordPlain, salt);

        // 更新缓存中的密码哈希并落盘
        accountsCache[targetUsername].passwordHash = passwordHash;
        await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accountsCache, null, 2), 'utf8');
        console.log(`[AuthService] 玩家 [UID: ${targetUid}] 的密码已被 GM 强制重置`);
    }

    /**
     * 玩家自助修改密码
     * @param uid 玩家 UID
     * @param oldPasswordPlain 原密码明文
     * @param newPasswordPlain 新密码明文
     */
    static async playerChangePassword(uid: string, oldPasswordPlain: string, newPasswordPlain: string): Promise<void> {
        if (!isInitialized) await this.bootstrap();

        // 校验新密码长度
        if (!newPasswordPlain || newPasswordPlain.length < 6 || newPasswordPlain.length > 16) {
            throw new Error('新密码长度必须在 6 到 16 个字符之间');
        }

        // 查找对应的账号记录
        let targetUsername = null;
        for (const [uname, info] of Object.entries(accountsCache)) {
            if (info.uid === uid) {
                targetUsername = uname;
                break;
            }
        }

        if (!targetUsername) {
            throw new Error(`找不到当前玩家 [UID: ${uid}]`);
        }

        const accountInfo = accountsCache[targetUsername];

        // 校验原密码
        const isMatch = await bcrypt.compare(oldPasswordPlain, accountInfo.passwordHash);
        if (!isMatch) {
            throw new Error("原密码错误");
        }

        // 使用 bcrypt 重新计算新密码的哈希
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPasswordPlain, salt);

        // 更新缓存中的密码哈希并落盘
        accountsCache[targetUsername].passwordHash = passwordHash;
        await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accountsCache, null, 2), 'utf8');
        console.log(`[AuthService] 玩家 [UID: ${uid}] 成功自助修改了密码`);
    }
}
