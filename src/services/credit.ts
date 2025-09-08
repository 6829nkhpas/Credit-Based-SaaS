import { prisma } from '../db/prisma';
import { BlockchainService } from './blockchain';
import { logger } from '../utils/logger';
import { InsufficientCreditsError, NotFoundError } from '../utils/errors';

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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, credits: true, email: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if user has enough credits
    if (user.credits < cost) {
      throw new InsufficientCreditsError(
        `Insufficient credits. Required: ${cost}, Available: ${user.credits}`
      );
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct credits
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: cost } },
      });

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
      await tx.auditLog.create({
        data: {
          userId,
          action,
          cost,
          creditsAfter: updatedUser.credits,
          txHash,
          metadata,
          ipAddress,
          userAgent,
        },
      });

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
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: ActionType.CREDIT_ADMIN_ADD,
        cost: -amount, // Negative cost indicates credit addition
        creditsAfter: updatedUser.credits,
        metadata: {
          targetUserId: userId,
          reason,
          amount,
        },
      },
    });

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
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Add credits
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: credits } },
      });

      // Create payment record
      await tx.payment.create({
        data: {
          userId,
          amount,
          credits,
          provider,
          transactionId: paymentId,
          status: 'completed',
          completedAt: new Date(),
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: ActionType.CREDIT_PURCHASE,
          cost: -credits, // Negative cost indicates credit addition
          creditsAfter: updatedUser.credits,
          metadata: {
            amount,
            provider,
            paymentId,
          },
        },
      });

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
  }

  /**
   * Get user credit balance
   */
  async getCreditBalance(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user.credits;
  }

  /**
   * Get credit usage history
   */
  async getCreditHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Array<{
    id: string;
    action: string;
    cost: number;
    creditsAfter: number;
    txHash: string | null;
    createdAt: Date;
    metadata: any;
  }>> {
    const history = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        action: true,
        cost: true,
        creditsAfter: true,
        txHash: true,
        createdAt: true,
        metadata: true,
      },
    });

    return history;
  }

  /**
   * Get credit statistics
   */
  async getCreditStats(userId: string): Promise<{
    totalSpent: number;
    totalPurchased: number;
    currentBalance: number;
    transactionCount: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const stats = await prisma.auditLog.aggregate({
      where: { userId },
      _sum: {
        cost: true,
      },
      _count: {
        id: true,
      },
    });

    const purchases = await prisma.auditLog.aggregate({
      where: {
        userId,
        action: {
          in: [ActionType.CREDIT_PURCHASE, ActionType.CREDIT_ADMIN_ADD],
        },
      },
      _sum: {
        cost: true,
      },
    });

    const totalSpent = Math.abs(stats._sum.cost || 0) - Math.abs(purchases._sum.cost || 0);
    const totalPurchased = Math.abs(purchases._sum.cost || 0);

    return {
      totalSpent,
      totalPurchased,
      currentBalance: user.credits,
      transactionCount: stats._count.id || 0,
    };
  }
}
