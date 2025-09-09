import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import ms from 'ms';
import { config } from '../config/environment';
import { RefreshToken } from '../models';
import { AuthenticationError } from './errors';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

export class TokenService {
  /**
   * Generate access token
   */
  static generateAccessToken(payload: Omit<JwtPayload, 'type'>): string {
    const tokenPayload = { ...payload, type: 'access' as const };
    return jwt.sign(tokenPayload, config.JWT_ACCESS_SECRET, { 
      expiresIn: '15m'
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: Omit<JwtPayload, 'type'>): string {
    const tokenPayload = { ...payload, type: 'refresh' as const };
    return jwt.sign(tokenPayload, config.JWT_REFRESH_SECRET, { 
      expiresIn: '7d'
    });
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
      if (decoded.type !== 'access') {
        throw new AuthenticationError('Invalid token type');
      }
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired');
      }
      throw new AuthenticationError('Invalid token');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as JwtPayload;
      if (decoded.type !== 'refresh') {
        throw new AuthenticationError('Invalid token type');
      }
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired');
      }
      throw new AuthenticationError('Invalid token');
    }
  }

  /**
   * Store refresh token in database
   */
  static async storeRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const refreshToken = new RefreshToken({
      token,
      userId,
      expiresAt,
    });

    await refreshToken.save();
  }

  /**
   * Revoke refresh token
   */
  static async revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token },
      data: { revoked: true },
    });
  }

  /**
   * Revoke all user tokens
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  }

  /**
   * Check if refresh token is valid
   */
  static async isRefreshTokenValid(token: string): Promise<boolean> {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Generate API key
   */
  static generateApiKey(): string {
    return `sk_${uuidv4().replace(/-/g, '')}`;
  }

  /**
   * Clean expired tokens
   */
  static async cleanExpiredTokens(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revoked: true },
        ],
      },
    });
  }
}
