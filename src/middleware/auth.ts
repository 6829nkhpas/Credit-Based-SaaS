import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { User, ApiKey } from '../models';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { config } from '../config/environment';

/**
 * JWT Authentication Middleware
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Access token required');
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET as string) as JwtPayload;
    
    // Find user in database
    const user = await User.findById(decoded.userId).select('_id email role firstName isActive');

    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid or inactive user');
    }

    req.user = {
      id: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      name: user.firstName || '',
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * API Key Authentication Middleware
 */
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      throw new AuthenticationError('API key required');
    }

    // Find API key in database with populated user
    const key = await ApiKey.findOne({ key: apiKey, isActive: true }).populate('userId');

    if (!key || !key.userId) {
      throw new AuthenticationError('Invalid API key');
    }

    // Check expiration
    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new AuthenticationError('API key expired');
    }

    // Update last used timestamp
    await ApiKey.findByIdAndUpdate(key._id, { lastUsedAt: new Date() });

    // Add API key info to request
    req.apiKey = {
      id: (key._id as any).toString(),
      scope: (key as any).scope,
      userId: (key as any).userId.toString(),
    };

    // Add user info to request
    const user = (key as any).userId;
    req.user = {
      id: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional Authentication Middleware
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authenticate(req, res, next);
    } else if (apiKey) {
      return authenticateApiKey(req, res, next);
    }

    // No authentication provided, continue without user
    next();
  } catch (error) {
    // If authentication fails, continue without user
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new AuthenticationError('Insufficient permissions');
    }

    next();
  };
};

/**
 * Admin authorization middleware
 */
export const authorizeAdmin = authorize(['admin']);

/**
 * User or Admin authorization middleware
 */
export const authorizeUser = authorize(['user', 'admin']);
