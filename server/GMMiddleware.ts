import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET environment variable is missing.');
    process.exit(1);
}

// 扩展 Express Request 类型以支持附加 user 信息
export interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;
        username: string;
        role: string;
    };
}

/**
 * 通用 JWT 认证中间件
 * 解析头部的 Authorization: Bearer <token>
 */
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Auth token missing or malformed' });
        return; // 由于 Express Middleware 中的类型声明，不再返回 response 以防止类型错误，使用 return 空代替
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = {
            uid: decoded.uid,
            username: decoded.username,
            role: decoded.role
        };
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' });
        return;
    }
};

/**
 * GM / 管理员权限认证中间件
 * 必须在 requireAuth 之后使用
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    if (req.user.role !== 'admin') {
        res.status(403).json({ error: 'Access denied: GM privileges required' });
        return;
    }

    next();
};
