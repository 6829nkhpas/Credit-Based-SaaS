#!/bin/bash

echo "🔧 Creating proper MongoDB route files..."

# Fix user.ts route
cat > src/routes/user.ts << 'EOF'
import { Router, Request, Response } from 'express';
import { User, File, Report } from '../models';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { creditService } from '../services/credit';
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
      filename,
      originalName,
      mimeType,
      size,
      content: Buffer.from(content, 'base64'),
    });

    // Deduct credit
    const creditResult = await creditService.deductCredits(userId, 1, 'file_upload', {
      fileId: file._id.toString(),
      filename: file.filename,
      size: file.size,
    });

    // Log audit
    await auditService.log(
      userId,
      'file_upload',
      {
        fileId: file._id.toString(),
        filename: file.filename,
        size: file.size,
      },
      req.ip
    );

    res.json({
      success: true,
      data: {
        id: file._id,
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        uploadedAt: file.uploadedAt,
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
    const creditResult = await creditService.deductCredits(userId, 5, 'report_generation', {
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
      description,
      fileId,
      summary: 'This is a generated report based on your data.',
    });

    res.json({
      success: true,
      data: {
        id: report._id,
        title: report.title,
        description: report.description,
        generatedAt: report.generatedAt,
        summary: report.summary,
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

    // Add credits
    const creditResult = await creditService.addCredits(userId, amount, 'purchase', {
      paymentMethod,
      amount,
    });

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
        creditsRemaining: creditResult.remainingCredits,
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
      .sort({ uploadedAt: -1 })
      .limit(limit)
      .skip(offset)
      .select('_id filename originalName mimeType size uploadedAt');

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
      .sort({ generatedAt: -1 })
      .limit(limit)
      .skip(offset)
      .select('_id title description generatedAt fileId');

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
EOF

# Fix service.ts route
cat > src/routes/service.ts << 'EOF'
import { Router, Request, Response } from 'express';
import { File, Report, ApiKey } from '../models';
import { authenticateApiKey } from '../middleware/auth';
import { AppError } from '../utils/errors';

const router = Router();

// Get service history
router.get('/history', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let data;
    let total;

    if (type === 'file') {
      data = await File.find({ userId })
        .select('_id filename originalName mimeType size uploadedAt')
        .sort({ uploadedAt: -1 })
        .limit(Number(limit))
        .skip(offset);
      
      total = await File.countDocuments({ userId });
    } else if (type === 'report') {
      data = await Report.find({ userId })
        .select('_id title description generatedAt fileId')
        .sort({ generatedAt: -1 })
        .limit(Number(limit))
        .skip(offset);
      
      total = await Report.countDocuments({ userId });
    } else {
      throw new AppError('Invalid history type', 400);
    }

    res.json({
      success: true,
      data: {
        items: data,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// Get service files  
router.get('/files', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const files = await File.find({ userId })
      .select('_id filename originalName mimeType size uploadedAt')
      .sort({ uploadedAt: -1 })
      .limit(limit)
      .skip(offset);

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

// Get service reports
router.get('/reports', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const reports = await Report.find({ userId })
      .select('_id title description generatedAt fileId')
      .sort({ generatedAt: -1 })
      .limit(limit)
      .skip(offset);

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

// Get API key info
router.get('/api-key', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const apiKey = await ApiKey.findById(req.apiKey!.id).populate({
      path: 'userId',
      select: '_id email firstName'
    });

    if (!apiKey) {
      throw new AppError('API key not found', 404);
    }

    res.json({
      success: true,
      data: {
        id: apiKey._id,
        name: apiKey.name,
        scope: apiKey.scope,
        lastUsedAt: apiKey.lastUsedAt,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        user: {
          id: (apiKey.userId as any)._id,
          email: (apiKey.userId as any).email,
          name: (apiKey.userId as any).firstName,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch API key info' });
  }
});

export default router;
EOF

echo "✅ Fixed route files with proper MongoDB syntax!"
echo "🎉 Route migration completed!"
