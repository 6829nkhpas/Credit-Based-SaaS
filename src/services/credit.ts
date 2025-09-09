import { User, AuditLog, Payment } from '../models';
import { BlockchainService } from './blockchain';
import { logger } from '../utils/logger';
import { InsufficientCreditsError, NotFoundError } from '../utils/errors';
import mongoose from 'mongoose';

export enum ActionType {
  UPLOAD_FILE = 'UPLOAD_FILE',
  GENERATE_REPORT = 'GENERATE_REPORT',
  EXPORT_REPORT = 'EXPORT_REPORT',
  API_KEY_ACTION = 'API_KEY_ACTION',
  LIST_FILES = 'LIST_FILES',
  CREDIT_PURCHASE = 'CREDIT_PURCHASE',
  CREDIT_ADMIN_ADD = 'CREDIT_ADMIN_ADD',
}

export const ACTION_COSTS: Record<ActionType, number> = {
  [ActionType.UPLOAD_FILE]: 10,
  [ActionType.GENERATE_REPORT]: 5,
  [ActionType.EXPORT_REPORT]: 2,
  [ActionType.API_KEY_ACTION]: 3,
  [ActionType.LIST_FILES]: 0,
  [ActionType.CREDIT_PURCHASE]: 0,
  [ActionType.CREDIT_ADMIN_ADD]: 0,
};

export class CreditService {
  private blockchainService: BlockchainService;

  constructor() {
    this.blockchainService = new BlockchainService();
  }

  /**
   * Deduct credits for an action
   */
  async deductCredits(
    userId: string,
    action: ActionType,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; remainingCredits: number; txHash?: string }> {
    const cost = ACTION_COSTS[action];

    // Free actions don't require credit deduction
    if (cost === 0) {
      return { success: true, remainingCredits: 0 };
    }

    // Get user
    const user = await User.findById(userId).select('id credits email');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if user has enough credits
    if (user.credits < cost) {
      throw new InsufficientCreditsError(
        `Insufficient credits. Required: ${cost}, Available: ${user.credits}`
      );
    }

    // Start MongoDB transaction
    const session = await mongoose.startSession();
    
    try {
      const result = await session.withTransaction(async () => {
        // Deduct credits
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { $inc: { credits: -cost } },
          { new: true, session }
        );

        if (!updatedUser) {
          throw new NotFoundError('User not found during update');
        }

        // Process blockchain transaction
        let txHash: string | undefined;
        try {
          txHash = await this.blockchainService.transferCredits(userId, cost);
        } catch (error) {
          logger.error('Blockchain transaction failed, but credits already deducted', {
            userId,
            action,
            cost,
            error,
          });
          // Continue without blockchain transaction for now
          // In production, you might want to implement retry logic
        }

        // Create audit log
        const auditLog = new AuditLog({
          userId,
          action,
          cost,
          creditsAfter: updatedUser.credits,
          txHash,
          metadata,
          ipAddress,
          userAgent,
        });

        await auditLog.save({ session });

        return {
          success: true,
          remainingCredits: updatedUser.credits,
          txHash,
        };
      });

      logger.info('Credits deducted successfully', {
        userId,
        action,
        cost,
        remainingCredits: result.remainingCredits,
        txHash: result.txHash,
      });

      return result;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Add credits to user (admin function)
   */
  async addCredits(
    userId: string,
    amount: number,
    adminId: string,
    reason?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { credits: amount } },
      { new: true }
    );

    if (!updatedUser) {
      throw new NotFoundError('Failed to update user credits');
    }

    // Create audit log
    const auditLog = new AuditLog({
      userId: adminId,
      action: ActionType.CREDIT_ADMIN_ADD,
      cost: -amount, // Negative cost indicates credit addition
      creditsAfter: updatedUser.credits,
      metadata: {
        targetUserId: userId,
        reason,
        amount,
      },
    });

    await auditLog.save();

    logger.info('Credits added by admin', {
      userId,
      adminId,
      amount,
      newBalance: updatedUser.credits,
      reason,
    });

    return {
      success: true,
      newBalance: updatedUser.credits,
    };
  }

  /**
   * Purchase credits via payment
   */
  async purchaseCredits(
    userId: string,
    amount: number,
    credits: number,
    paymentId: string,
    provider: string
  ): Promise<{ success: boolean; newBalance: number }> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const session = await mongoose.startSession();

    try {
      const result = await session.withTransaction(async () => {
        // Add credits
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { $inc: { credits: credits } },
          { new: true, session }
        );

        if (!updatedUser) {
          throw new NotFoundError('User not found during update');
        }

        // Create payment record
        const payment = new Payment({
          userId,
          amount,
          credits,
          provider,
          transactionId: paymentId,
          status: 'completed',
          completedAt: new Date(),
        });

        await payment.save({ session });

        // Create audit log
        const auditLog = new AuditLog({
          userId,
          action: ActionType.CREDIT_PURCHASE,
          cost: -credits, // Negative cost indicates credit addition
          creditsAfter: updatedUser.credits,
          metadata: {
            amount,
            provider,
            paymentId,
          },
        });

        await auditLog.save({ session });

        return {
          success: true,
          newBalance: updatedUser.credits,
        };
      });

      logger.info('Credits purchased successfully', {
        userId,
        amount,
        credits,
        paymentId,
        provider,
        newBalance: result.newBalance,
      });

      return result;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get user's current credit balance
   */
  async getBalance(userId: string): Promise<number> {
    const user = await User.findById(userId).select('credits');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user.credits;
  }

  /**
   * Get credit usage history
   */
  async getUsageHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<{
    history: any[];
    total: number;
    summary: {
      totalSpent: number;
      totalPurchased: number;
      currentBalance: number;
    };
  }> {
    const user = await User.findById(userId).select('credits');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get audit logs with pagination
    const [history, total] = await Promise.all([
      AuditLog.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean(),
      AuditLog.countDocuments({ userId }),
    ]);

    // Calculate summary statistics
    const [totalSpentResult, totalPurchasedResult] = await Promise.all([
      AuditLog.aggregate([
        { $match: { userId, cost: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$cost' } } },
      ]),
      AuditLog.aggregate([
        { $match: { userId, cost: { $lt: 0 } } },
        { $group: { _id: null, total: { $sum: { $abs: '$cost' } } } },
      ]),
    ]);

    const totalSpent = totalSpentResult[0]?.total || 0;
    const totalPurchased = totalPurchasedResult[0]?.total || 0;

    return {
      history,
      total,
      summary: {
        totalSpent,
        totalPurchased,
        currentBalance: user.credits,
      },
    };
  }

  /**
   * Get detailed usage statistics
   */
  async getUsageStatistics(userId: string): Promise<{
    totalCreditsUsed: number;
    creditsPurchased: number;
    currentBalance: number;
    actionBreakdown: Record<string, { count: number; totalCost: number }>;
  }> {
    const user = await User.findById(userId).select('credits');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get aggregated statistics
    const [usageStats, purchaseStats, actionBreakdown] = await Promise.all([
      AuditLog.aggregate([
        { $match: { userId, cost: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$cost' } } },
      ]),
      AuditLog.aggregate([
        { $match: { userId, cost: { $lt: 0 } } },
        { $group: { _id: null, total: { $sum: { $abs: '$cost' } } } },
      ]),
      AuditLog.aggregate([
        { $match: { userId, cost: { $gt: 0 } } },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            totalCost: { $sum: '$cost' },
          },
        },
      ]),
    ]);

    const totalCreditsUsed = usageStats[0]?.total || 0;
    const creditsPurchased = purchaseStats[0]?.total || 0;

    // Format action breakdown
    const actionBreakdownFormatted: Record<string, { count: number; totalCost: number }> = {};
    actionBreakdown.forEach((item) => {
      actionBreakdownFormatted[item._id] = {
        count: item.count,
        totalCost: item.totalCost,
      };
    });

    return {
      totalCreditsUsed,
      creditsPurchased,
      currentBalance: user.credits,
      actionBreakdown: actionBreakdownFormatted,
    };
  }

  /**
   * Get user's current credit balance (alias for getBalance)
   */
  async getCreditBalance(userId: string): Promise<number> {
    return this.getBalance(userId);
  }

  /**
   * Get credit usage history (alias for getUsageHistory)
   */
  async getCreditHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<{
    history: any[];
    total: number;
    summary: {
      totalSpent: number;
      totalPurchased: number;
      currentBalance: number;
    };
  }> {
    return this.getUsageHistory(userId, limit, offset);
  }

  /**
   * Get detailed usage statistics (alias for getUsageStatistics)
   */
  async getCreditStats(userId: string): Promise<{
    totalCreditsUsed: number;
    creditsPurchased: number;
    currentBalance: number;
    actionBreakdown: Record<string, { count: number; totalCost: number }>;
  }> {
    return this.getUsageStatistics(userId);
  }
}
