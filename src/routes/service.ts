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
