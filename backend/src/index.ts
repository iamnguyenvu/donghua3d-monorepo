import express, { Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { authenticateJWT, AuthenticatedRequest } from './middleware/auth.middleware';

// Import Route Handlers
import authRouter from './controllers/auth.controller';
import movieRouter from './controllers/movie.controller';
import ratingRouter from './controllers/rating.controller';
import commentRouter from './controllers/comment.controller';
import tierRouter from './controllers/tier.controller';

const app = express();

// 1. Global Middlewares
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply JWT extractor globally (Populates req.user if auth token exists)
app.use(authenticateJWT);

// 2. Register REST Endpoints
app.use('/auth', authRouter);
app.use('/catalog', movieRouter);
app.use('/ratings', ratingRouter);
app.use('/comments', commentRouter);
app.use('/tiers', tierRouter);

// 3. Health check route
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', environment: config.nodeEnv });
});

// 4. Global Error Handling Middleware
app.use((err: any, _req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
  console.error('💥 Unhandled exception caught by global boundary:', err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: config.nodeEnv === 'development' ? err.message : 'Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau.',
    },
  });
});

// 5. Start server listener
app.listen(config.port, () => {
  console.log(`========================================================`);
  console.log(` 🚀 DONGHUA3D EXPRESS RUNNING ON PORT ${config.port} [${config.nodeEnv.toUpperCase()}]`);
  console.log(` API Endpoint: http://localhost:${config.port}`);
  console.log(`========================================================`);
});
