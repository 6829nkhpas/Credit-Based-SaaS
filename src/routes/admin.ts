import { Router, Request, Response } from 'express';
import { User, ApiKey } from '../models';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { AppError } from '../utils/errors';

const router = Router();

// Get user by ID
router.get('/users/:id', authenticate, authorizeAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId).select('_id email firstName role credits isActive createdAt lastLoginAt');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// Update user
router.put('/users/:id', authenticate, authorizeAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true }
    ).select('_id email firstName role credits isActive');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', authenticate, authorizeAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// Revoke API key
router.delete('/api-keys/:id', authenticate, authorizeAdmin, async (req: Request, res: Response) => {
  try {
    const keyId = req.params.id;
    
    const key = await ApiKey.findByIdAndUpdate(
      keyId,
      { isActive: false },
      { new: true }
    );

    if (!key) {
      throw new AppError('API key not found', 404);
    }

    res.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to revoke API key' });
  }
});

// Get system stats
router.get('/stats', authenticate, authorizeAdmin, async (req: Request, res: Response) => {
  try {
    const [totalUsers, activeUsers, totalFiles, totalReports] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      0, // File count would go here
      0, // Report count would go here
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalFiles,
        totalReports,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// Get all users (with pagination)
router.get('/users', authenticate, authorizeAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const users = await User.find({})
      .select('_id email firstName role credits isActive createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);

    const total = await User.countDocuments({});

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

export default router;
