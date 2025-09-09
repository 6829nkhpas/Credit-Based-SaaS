import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import Stripe from 'stripe';
import Razorpay from 'razorpay';
import { authenticate } from '../middleware/auth';
import { validate, paymentSchemas } from '../middleware/validation';
import { CreditService } from '../services/credit';
import { User, ApiKey, AuditLog, File, Report, Payment, BlockchainTransaction } from '../models';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';

const router = Router();
const creditService = new CreditService();

// Initialize payment providers
const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
});

const razorpay = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_KEY_SECRET,
});

/**
 * Create payment intent for credit purchase
 */
router.post('/create-intent', 
  authenticate,
  validate(paymentSchemas.createPaymentIntent),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { amount, credits, provider } = req.body;

      let paymentIntent: any;

      if (provider === 'stripe') {
        paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          metadata: {
            userId,
            credits: credits.toString(),
          },
        });

        logger.info('Stripe payment intent created', {
          userId,
          amount,
          credits,
          paymentIntentId: paymentIntent.id,
        });

        res.json({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          provider: 'stripe',
        });
      } else if (provider === 'razorpay') {
        const order = await razorpay.orders.create({
          amount: Math.round(amount * 100), // Convert to paise
          currency: 'USD',
          notes: {
            userId,
            credits: credits.toString(),
          },
        });

        logger.info('Razorpay order created', {
          userId,
          amount,
          credits,
          orderId: order.id,
        });

        res.json({
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          provider: 'razorpay',
        });
      } else {
        res.status(400).json({
          error: 'Invalid payment provider',
        });
        return;
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Confirm payment and add credits
 */
router.post('/confirm', 
  authenticate,
  validate(paymentSchemas.confirmPayment),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { paymentIntentId, provider } = req.body;

      let paymentData: any;
      let amount: number;
      let credits: number;

      if (provider === 'stripe') {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status !== 'succeeded') {
          res.status(400).json({
            error: 'Payment not completed',
            status: paymentIntent.status,
          });
          return;
        }

        if (paymentIntent.metadata.userId !== userId) {
          res.status(403).json({
            error: 'Payment belongs to different user',
          });
          return;
        }

        amount = paymentIntent.amount / 100; // Convert from cents
        credits = parseInt(paymentIntent.metadata.credits, 10);
        paymentData = paymentIntent;
      } else if (provider === 'razorpay') {
        // For Razorpay, you would typically verify the payment signature here
        // This is a simplified version
        const order = await razorpay.orders.fetch(paymentIntentId);
        
        if (order.status !== 'paid') {
          res.status(400).json({
            error: 'Payment not completed',
            status: order.status,
          });
          return;
        }

        if (order.notes?.userId !== userId) {
          res.status(403).json({
            error: 'Payment belongs to different user',
          });
          return;
        }

        amount = Number(order.amount) / 100; // Convert from paise
        credits = parseInt(String(order.notes?.credits || '0'), 10);
        paymentData = order;
      } else {
        res.status(400).json({
          error: 'Invalid payment provider',
        });
        return;
      }

      // Add credits to user
      const result = await creditService.purchaseCredits(
        userId,
        amount,
        credits,
        paymentIntentId,
        provider
      );

      logger.info('Payment confirmed and credits added', {
        userId,
        amount,
        credits,
        paymentIntentId,
        provider,
        newBalance: result.newBalance,
      });

      res.json({
        message: 'Payment confirmed and credits added',
        creditsAdded: credits,
        newBalance: result.newBalance,
        transaction: {
          id: paymentIntentId,
          amount,
          provider,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get payment history
 */
router.get('/history', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        amount: true,
        currency: true,
        credits: true,
        provider: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });

    const total = await prisma.payment.count({
      where: { userId },
    });

    res.json({
      payments,
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
 * Stripe webhook handler
 */
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, config.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      logger.error('Stripe webhook signature verification failed', { error: err });
      res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      return;
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      logger.info('Stripe payment intent succeeded', {
        paymentIntentId: paymentIntent.id,
        userId: paymentIntent.metadata.userId,
      });

      // You might want to update payment status here if needed
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Get payment pricing tiers
 */
router.get('/pricing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pricingTiers = [
      {
        name: 'Starter',
        credits: 100,
        price: 9.99,
        pricePerCredit: 0.0999,
        popular: false,
      },
      {
        name: 'Professional',
        credits: 500,
        price: 39.99,
        pricePerCredit: 0.0799,
        popular: true,
      },
      {
        name: 'Enterprise',
        credits: 1000,
        price: 69.99,
        pricePerCredit: 0.0699,
        popular: false,
      },
      {
        name: 'Premium',
        credits: 2500,
        price: 149.99,
        pricePerCredit: 0.0599,
        popular: false,
      },
    ];

    res.json({
      pricingTiers,
    });
  } catch (error) {
    next(error);
  }
});

export { router as paymentRoutes };
