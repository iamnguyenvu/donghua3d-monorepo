import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config';

// 1. Extend the Express Request interface locally for type safety
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
  };
}

interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

// 2. Extract and authenticate JWT if present in Authorization header
export function authenticateJWT(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (err) {
      // Token is invalid or expired, do not attach user. 
      // Public routes will still work; guarded routes will block via requireAuth.
    }
  }

  next();
}

// 3. Endpoint Guard: Requires a valid logged-in user
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Yêu cầu đăng nhập để truy cập tài nguyên này.',
      },
    });
    return;
  }
  next();
}

// 4. Endpoint Guard: Restricts access to specific role tiers (e.g. Admin, Expert)
export function requireRole(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Yêu cầu đăng nhập để truy cập.',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Tài khoản không đủ quyền hạn thực hiện hành động này.',
        },
      });
      return;
    }

    next();
  };
}
