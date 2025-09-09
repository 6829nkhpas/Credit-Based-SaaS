import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate, adminSchemas } from '../middleware/validation';
import { CreditService } from '../services/credit';
import { TokenService } from '../utils/token';
import { User, ApiKey, AuditLog, File, Report, Payment, BlockchainTransaction } from '../models';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();
const creditService = new CreditService();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('ADMIN'));

/**
 * Get all users
 */
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;

    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { name: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        credits: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            auditLogs: true,
            files: true,
            reports: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.user.count({ where });

    res.json({
      users,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get user by ID
 */
router.get('/users/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            auditLogs: true,
            files: true,
            reports: true,
            apiKeys: true,
            refreshTokens: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Don't return password hash
    const { password, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword });
  } catch (error) {
    next(error);
  }
});

/**
 * Update user
 */
router.put('/users/:userId', 
  validate(adminSchemas.updateUser),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const updates = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updates,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          credits: true,
          isActive: true,
          updatedAt: true,
        },
      });

      logger.info('User updated by admin', {
        adminId: req.user!.id,
        userId,
        updates,
      });

      res.json({
        message: 'User updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Add credits to user
 */
router.post('/users/credits/add', 
  validate(adminSchemas.addCredits),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, amount, reason } = req.body;
      const adminId = req.user!.id;

      const result = await creditService.addCredits(userId, amount, adminId, reason);

      res.json({
        message: 'Credits added successfully',
        newBalance: result.newBalance,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Create API key for user
 */
router.post('/api-keys', 
  validate(adminSchemas.createApiKey),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, name, scope, expiresAt } = req.body;
      const adminId = req.user!.id;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Generate API key
      const key = TokenService.generateApiKey();

      // Create API key record
      const apiKey = await prisma.apiKey.create({
        data: {
          key,
          name,
          scope,
          userId,
          expiresAt,
        },
        select: {
          id: true,
          key: true,
          name: true,
          scope: true,
          expiresAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      logger.info('API key created by admin', {
        adminId,
        userId,
        keyId: apiKey.id,
        scope,
      });

      res.status(201).json({
        message: 'API key created successfully',
        apiKey,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * List API keys
 */
router.get('/api-keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const userId = req.query.userId as string;

    const where = userId ? { userId } : {};

    const apiKeys = await prisma.apiKey.findMany({
      where,
      select: {
        id: true,
        name: true,
        scope: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.apiKey.count({ where });

    res.json({
      apiKeys,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Revoke API key
 */
router.delete('/api-keys/:keyId', 
  validate(adminSchemas.revokeApiKey),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { keyId } = req.params;
      const adminId = req.user!.id;

      const apiKey = await prisma.apiKey.findUnique({
        where: { id: keyId },
      });

      if (!apiKey) {
        throw new NotFoundError('API key not found');
      }

      await prisma.apiKey.update({
        where: { id: keyId },
        data: { isActive: false },
      });

      logger.info('API key revoked by admin', {
        adminId,
        keyId,
        userId: apiKey.userId,
      });

      res.json({
        message: 'API key revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get audit logs
 */
router.get('/audit-logs', 
  validate(adminSchemas.getAuditLogs),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        userId,
        action,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
      } = req.query;

      const where: any = {};

      if (userId) where.userId = userId as string;
      if (action) where.action = action as string;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const auditLogs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      });

      const total = await prisma.auditLog.count({ where });

      res.json({
        auditLogs,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get system statistics
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalCreditsSpent,
      totalFiles,
      totalReports,
      totalTransactions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.auditLog.aggregate({
        _sum: { cost: true },
        where: { cost: { gt: 0 } },
      }),
      prisma.file.count(),
      prisma.report.count(),
      prisma.blockchainTransaction.count(),
    ]);

    const recentActivity = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        totalCreditsSpent: totalCreditsSpent._sum.cost || 0,
        totalFiles,
        totalReports,
        totalTransactions,
      },
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Revoke all user tokens
 */
router.post('/users/:userId/revoke-tokens', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const adminId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await TokenService.revokeAllUserTokens(userId);

    logger.info('All user tokens revoked by admin', {
      adminId,
      userId,
    });

    res.json({
      message: 'All user tokens revoked successfully',
    });
  } catch (error) {
    next(error);
  }
});

export { router as adminRoutes };
