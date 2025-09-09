import { Router, Request, Response, NextFunction } from 'express';
import { authenticateApiKey, authorizeApiKeyScope } from '../middleware/auth';
import { validate, serviceSchemas } from '../middleware/validation';
import { CreditService, ActionType } from '../services/credit';
import { User, ApiKey, AuditLog, File, Report, Payment, BlockchainTransaction } from '../models';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();
const creditService = new CreditService();

// All service routes require API key authentication
router.use(authenticateApiKey);

/**
 * Fetch metadata (costs 3 credits)
 */
router.get('/metadata/:resourceId', 
  authorizeApiKeyScope('READ_ONLY', 'WRITE_ONLY', 'ADMIN'),
  validate(serviceSchemas.fetchMetadata),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { resourceId } = req.params;
      const { type } = req.query;

      // Deduct credits
      const creditResult = await creditService.deductCredits(
        userId,
        ActionType.API_KEY_ACTION,
        {
          resourceId,
          type,
          action: 'fetch_metadata',
          apiKeyId: req.apiKey!.id,
        },
        req.ip,
        req.get('User-Agent')
      );

      let metadata;

      if (type === 'file') {
        const file = await prisma.file.findFirst({
          where: {
            id: resourceId,
            userId,
          },
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            uploadedAt: true,
          },
        });

        if (!file) {
          throw new NotFoundError('File not found');
        }

        metadata = {
          type: 'file',
          resource: file,
        };
      } else if (type === 'report') {
        const report = await prisma.report.findFirst({
          where: {
            id: resourceId,
            userId,
          },
          select: {
            id: true,
            title: true,
            description: true,
            generatedAt: true,
            metadata: true,
            fileId: true,
          },
        });

        if (!report) {
          throw new NotFoundError('Report not found');
        }

        metadata = {
          type: 'report',
          resource: report,
        };
      } else {
        throw new NotFoundError('Invalid resource type');
      }

      logger.info('Metadata fetched via API key', {
        userId,
        resourceId,
        type,
        apiKeyId: req.apiKey!.id,
        txHash: creditResult.txHash,
      });

      res.json({
        message: 'Metadata fetched successfully',
        metadata,
        creditsRemaining: creditResult.remainingCredits,
        txHash: creditResult.txHash,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * List user resources
 */
router.get('/resources', 
  authorizeApiKeyScope('READ_ONLY', 'WRITE_ONLY', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const type = req.query.type as string;

      let resources;

      if (!type || type === 'files') {
        const files = await prisma.file.findMany({
          where: { userId },
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            uploadedAt: true,
          },
          orderBy: { uploadedAt: 'desc' },
          take: limit,
          skip: offset,
        });

        if (!type) {
          resources = { files };
        } else {
          resources = files;
        }
      }

      if (!type || type === 'reports') {
        const reports = await prisma.report.findMany({
          where: { userId },
          select: {
            id: true,
            title: true,
            description: true,
            generatedAt: true,
            fileId: true,
          },
          orderBy: { generatedAt: 'desc' },
          take: limit,
          skip: offset,
        });

        if (!type) {
          resources = { ...resources, reports };
        } else {
          resources = reports;
        }
      }

      logger.info('Resources listed via API key', {
        userId,
        type,
        apiKeyId: req.apiKey!.id,
      });

      res.json({
        message: 'Resources fetched successfully',
        resources,
        pagination: {
          limit,
          offset,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get user credit balance
 */
router.get('/credits', 
  authorizeApiKeyScope('READ_ONLY', 'WRITE_ONLY', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const balance = await creditService.getCreditBalance(userId);

      res.json({
        credits: balance,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get API key information
 */
router.get('/api-key/info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: req.apiKey!.id },
      select: {
        id: true,
        name: true,
        scope: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            credits: true,
          },
        },
      },
    });

    if (!apiKey) {
      throw new NotFoundError('API key not found');
    }

    res.json({
      apiKey,
    });
  } catch (error) {
    next(error);
  }
});

export { router as serviceRoutes };
