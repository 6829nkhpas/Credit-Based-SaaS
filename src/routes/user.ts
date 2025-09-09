import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { validate, userSchemas } from '../middleware/validation';
import { CreditService, ActionType } from '../services/credit';
import { S3Service } from '../services/s3';
import { prisma } from '../db/prisma';
import { NotFoundError, InsufficientCreditsError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const creditService = new CreditService();
const s3Service = new S3Service();

/**
 * Get user profile and credit balance
 */
router.get('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        credits: true,
        createdAt: true,
        lastLoginAt: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get credit balance
 */
router.get('/credits', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const balance = await creditService.getCreditBalance(userId);
    
    res.json({
      credits: balance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get credit history
 */
router.get('/credits/history', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const history = await creditService.getCreditHistory(userId, limit, offset);
    
    res.json({
      history: history.history,
      pagination: {
        limit,
        offset,
        total: history.total,
      },
      summary: history.summary,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get credit statistics
 */
router.get('/credits/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const stats = await creditService.getCreditStats(userId);
    
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * Upload file (costs 10 credits)
 */
router.post('/upload', 
  authenticate, 
  upload.single('file'), 
  validate(userSchemas.uploadFile),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      // Deduct credits first
      const creditResult = await creditService.deductCredits(
        userId,
        ActionType.UPLOAD_FILE,
        {
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
        req.ip,
        req.get('User-Agent')
      );

      try {
        // Upload to S3
        const s3Result = await s3Service.uploadFile(file);

        // Save file record
        const fileRecord = await prisma.file.create({
          data: {
            filename: s3Result.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            s3Key: s3Result.key,
            s3Url: s3Result.url,
            userId,
          },
        });

        logger.info('File uploaded successfully', {
          userId,
          fileId: fileRecord.id,
          filename: file.originalname,
          txHash: creditResult.txHash,
        });

        res.status(201).json({
          message: 'File uploaded successfully',
          file: fileRecord,
          creditsRemaining: creditResult.remainingCredits,
          txHash: creditResult.txHash,
        });
      } catch (uploadError) {
        logger.error('File upload failed after credit deduction', {
          userId,
          error: uploadError,
          txHash: creditResult.txHash,
        });
        throw uploadError;
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Generate report (costs 5 credits)
 */
router.post('/reports/generate', 
  authenticate, 
  validate(userSchemas.generateReport),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { title, description, fileId, metadata } = req.body;

      // Deduct credits first
      const creditResult = await creditService.deductCredits(
        userId,
        ActionType.GENERATE_REPORT,
        {
          title,
          description,
          fileId,
          metadata,
        },
        req.ip,
        req.get('User-Agent')
      );

      try {
        // Simulate report generation (replace with actual logic)
        const reportContent = {
          title,
          description,
          generatedAt: new Date(),
          data: metadata || {},
          summary: 'This is a generated report based on your data.',
        };

        // Upload report to S3
        const reportBuffer = Buffer.from(JSON.stringify(reportContent, null, 2));
        const reportFile = {
          buffer: reportBuffer,
          originalname: `${title.replace(/[^a-zA-Z0-9]/g, '_')}_report.json`,
          mimetype: 'application/json',
        };

        const s3Result = await s3Service.uploadFile(reportFile as any);

        // Save report record
        const report = await prisma.report.create({
          data: {
            title,
            description,
            fileId,
            s3Key: s3Result.key,
            s3Url: s3Result.url,
            metadata: reportContent,
            userId,
          },
        });

        logger.info('Report generated successfully', {
          userId,
          reportId: report.id,
          title,
          txHash: creditResult.txHash,
        });

        res.status(201).json({
          message: 'Report generated successfully',
          report,
          creditsRemaining: creditResult.remainingCredits,
          txHash: creditResult.txHash,
        });
      } catch (generateError) {
        logger.error('Report generation failed after credit deduction', {
          userId,
          error: generateError,
          txHash: creditResult.txHash,
        });
        throw generateError;
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Download report (costs 2 credits)
 */
router.get('/reports/:reportId/download', 
  authenticate, 
  validate(userSchemas.downloadReport),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { reportId } = req.params;

      // Find report
      const report = await prisma.report.findFirst({
        where: {
          id: reportId,
          userId,
        },
      });

      if (!report) {
        throw new NotFoundError('Report not found');
      }

      // Deduct credits
      const creditResult = await creditService.deductCredits(
        userId,
        ActionType.EXPORT_REPORT,
        {
          reportId,
          title: report.title,
        },
        req.ip,
        req.get('User-Agent')
      );

      // Get signed URL from S3
      const downloadUrl = await s3Service.getSignedUrl(report.s3Key!);

      logger.info('Report download initiated', {
        userId,
        reportId,
        txHash: creditResult.txHash,
      });

      res.json({
        message: 'Download URL generated',
        downloadUrl,
        report: {
          id: report.id,
          title: report.title,
          description: report.description,
        },
        creditsRemaining: creditResult.remainingCredits,
        txHash: creditResult.txHash,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * List files (free)
 */
router.get('/files', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const files = await prisma.file.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        uploadedAt: true,
      },
    });

    const total = await prisma.file.count({
      where: { userId },
    });

    res.json({
      files,
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
 * List reports (free)
 */
router.get('/reports', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        description: true,
        generatedAt: true,
        fileId: true,
      },
    });

    const total = await prisma.report.count({
      where: { userId },
    });

    res.json({
      reports,
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

export { router as userRoutes };
