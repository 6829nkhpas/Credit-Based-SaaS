import { Router, Request, Response } from 'express';
import { User, File, Report } from '../models';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { creditService, ActionType } from '../services/credit';
import { auditService } from '../services/audit';
import { AppError } from '../utils/errors';

const router = Router();

// Get user profile
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const user = await User.findById(userId).select('_id email firstName role credits createdAt lastLoginAt isEmailVerified');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.firstName,
        role: user.role,
        credits: user.credits,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        emailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// Upload file
router.post('/upload', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { filename, originalName, mimeType, size, content } = req.body;

    // Check if user has enough credits
    const user = await User.findById(userId);
    if (!user || user.credits < 1) {
      throw new AppError('Insufficient credits', 400);
    }

    // Create file record
    const file = await File.create({
      userId,
      fileName: filename,
      originalName,
      mimeType,
      size,
      content: Buffer.from(content, 'base64'),
    });

    // Deduct credit
    const creditResult = await creditService.deductCredits(userId, ActionType.UPLOAD_FILE, {
      fileId: file._id!.toString(),
      filename: file.fileName,
      size: file.size,
    });

    // Log audit
    await auditService.log(
      userId,
      'file_upload',
      {
        fileId: file._id!.toString(),
        filename: file.fileName,
        size: file.size,
      },
      req.ip
    );

    res.json({
      success: true,
      data: {
        id: file._id,
        filename: file.fileName,
        originalName: file.originalName,
        size: file.size,
        uploadedAt: file.createdAt,
        creditsRemaining: creditResult.remainingCredits,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// Generate report
router.post('/generate-report', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, description, fileId } = req.body;

    // Check if user has enough credits
    const user = await User.findById(userId);
    if (!user || user.credits < 5) {
      throw new AppError('Insufficient credits for report generation', 400);
    }

    // Deduct credits first
    const creditResult = await creditService.deductCredits(userId, ActionType.GENERATE_REPORT, {
      title,
      description,
      fileId,
    });

    // Log audit
    await auditService.log(
      userId,
      'report_generation',
      {
        title,
        description,
        fileId,
      },
      req.ip
    );

    // Create report
    const report = await Report.create({
      userId,
      title,
      type: 'USAGE',
      format: 'JSON',
      data: { description, fileId },
    });

    res.json({
      success: true,
      data: {
        id: report._id,
        title: report.title,
        type: report.type,
        generatedAt: report.generatedAt,
        creditsRemaining: creditResult.remainingCredits,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Report generation failed' });
  }
});

// Purchase credits
router.post('/purchase-credits', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, paymentMethod } = req.body;

    // Process payment (mock implementation)
    const paymentSuccessful = true;

    if (!paymentSuccessful) {
      throw new AppError('Payment failed', 400);
    }

    // Add credits (fix the method signature)
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { credits: amount } },
      { new: true }
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Log audit
    await auditService.log(
      userId,
      'credit_purchase',
      {
        amount,
        paymentMethod,
      },
      req.ip
    );

    res.json({
      success: true,
      data: {
        creditsAdded: amount,
        creditsRemaining: user.credits,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Credit purchase failed' });
  }
});

// Get user files
router.get('/files', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const files = await File.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .select('_id fileName originalName mimeType size createdAt');

    const total = await File.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        files,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch files' });
  }
});

// Get user reports
router.get('/reports', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const reports = await Report.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .select('_id title type format createdAt');

    const total = await Report.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
});

export default router;
