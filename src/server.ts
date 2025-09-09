import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { config } from './config/environment';
import { logger } from './utils/logger';
import { database } from './db/connection';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import adminRoutes from './routes/admin';
import serviceRoutes from './routes/service';
import paymentRoutes from './routes/payment';
import { initializePassport } from './config/passport';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: [config.CLIENT_URL, config.ADMIN_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Passport
initializePassport();
app.use(passport.initialize());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api/payment', paymentRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.PORT || 3000;

// Initialize database connection and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await database.connect();
    logger.info('✅ MongoDB connected successfully');

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${config.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server', { error });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal, shutting down gracefully...');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal, shutting down gracefully...');
  await database.disconnect();
  process.exit(0);
});

// Start the server
startServer();

export default app;
