import { Router, Response, NextFunction } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { config } from '../config';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Helper to sign JWT token
function generateToken(user: { id: string; email: string; role: Role }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: '30d' }
  );
}

// 1. POST /api/auth/register
router.post('/register', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Email và mật khẩu không được để trống.' },
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Email này đã được đăng ký sử dụng.' },
      });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role: Role.USER, // Default self-registered role is standard audience
      },
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, role: user.role, reputationScore: user.reputationScore },
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/auth/login
router.post('/login', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Email và mật khẩu không được để trống.' },
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Email hoặc mật khẩu không chính xác.' },
      });
      return;
    }

    if (user.reputationScore <= 0) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Tài khoản của bạn đã bị khóa do vi phạm tiêu chuẩn cộng đồng.' },
      });
      return;
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, role: user.role, reputationScore: user.reputationScore },
      },
    });
  } catch (err) {
    next(err);
  }
});

// 3. GET /api/auth/me (Get profile state)
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // requireAuth guarantees req.user is populated
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, role: true, reputationScore: true, veteranSince: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Người dùng không tồn tại.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
