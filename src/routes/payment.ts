import { Router, Request, Response } from 'express';
import { Payment } from '../models';
import { authenticate } from '../middleware/auth';
import { AppError } from '../utils/errors';

const router = Router();

// Get user payments
router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const payments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .select('_id amount currency status paymentMethod metadata createdAt');

    const total = await Payment.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch payment history' });
  }
});

// Create payment intent
router.post('/create-intent', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, currency = 'USD', credits } = req.body;

    if (!amount || amount <= 0) {
      throw new AppError('Invalid amount', 400);
    }

    // Create payment record
    const payment = await Payment.create({
      userId,
      amount,
      currency,
      status: 'pending',
      paymentMethod: 'stripe',
      metadata: { credits },
    });

    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create payment intent' });
  }
});

export default router;
