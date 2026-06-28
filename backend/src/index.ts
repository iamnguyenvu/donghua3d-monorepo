import express, { Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { authenticateJWT, AuthenticatedRequest } from './middleware/auth.middleware';

// Import Route Handlers
import authRouter from './controllers/auth.controller';
import movieRouter from './controllers/movie.controller';
import ratingRouter from './controllers/rating.controller';
import commentRouter from './controllers/comment.controller';
import tierRouter from './controllers/tier.controller';
import watchlistRouter from './controllers/watchlist.controller';
import scraperRouter from './controllers/scraper.controller';
import adminRouter from './controllers/admin.controller';
import genreRouter from './controllers/genre.controller';
import analyticsRouter from './controllers/analytics.controller';
import danmakuRouter from './controllers/danmaku.controller';

// Import Services & Gateways
import { cronService } from './services/cron.service';
import { setupWatchPartyGateway } from './gateways/watchparty.gateway';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io server with CORS policy
const io = new Server(httpServer, {
  cors: {
    origin: [config.clientUrl, 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

// 1. Global Middlewares
app.use(cors({
  origin: [config.clientUrl, 'http://localhost:3000'],
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
app.use('/watchlist', watchlistRouter);
app.use('/scraper', scraperRouter);
app.use('/admin', adminRouter);
app.use('/genres', genreRouter);
app.use('/analytics', analyticsRouter);
app.use('/danmaku', danmakuRouter);

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

// Activate Real-time WebSockets
setupWatchPartyGateway(io);

// 5. Start server listener using httpServer instead of app to enable WebSockets
httpServer.listen(config.port, () => {
  console.log(`========================================================`);
  console.log(` 🚀 DONGHUA3D EXPRESS RUNNING ON PORT ${config.port} [${config.nodeEnv.toUpperCase()}]`);
  console.log(` API Endpoint: http://localhost:${config.port}`);
  console.log(`========================================================`);

  // Start background scheduled cron tasks
  cronService.startCronJobs();
});
