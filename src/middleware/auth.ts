import { Request, Response, NextFunction } from 'express';
import { TokenService, JwtPayload } from '../utils/token';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { User, ApiKey, AuditLog, File, Report, Payment, BlockchainTransaction } from '../models';

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

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // Verify token
    const payload: JwtPayload = TokenService.verifyAccessToken(token);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    // Add user to request
    req.user = {
      id: user.id,
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

    // Find API key in database
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!key || !key.isActive || !key.user.isActive) {
      throw new AuthenticationError('Invalid API key');
    }

    // Check expiration
    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new AuthenticationError('API key expired');
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    // Add API key and user to request
    req.apiKey = {
      id: key.id,
      scope: key.scope,
      userId: key.userId,
    };

    req.user = {
      id: key.user.id,
      email: key.user.email,
      role: key.user.role,
      name: key.user.name,
      isActive: key.user.isActive,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional Authentication Middleware (for public endpoints that can benefit from auth)
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
      // Try JWT authentication
      await authenticate(req, res, next);
    } else if (apiKey) {
      // Try API key authentication
      await authenticateApiKey(req, res, next);
    } else {
      // No authentication provided, continue without user
      next();
    }
  } catch (error) {
    // For optional auth, continue without user if auth fails
    next();
  }
};

/**
 * Role-based Authorization Middleware
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new AuthorizationError('Insufficient permissions');
    }

    next();
  };
};

/**
 * API Key Scope Authorization Middleware
 */
export const authorizeApiKeyScope = (...scopes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      throw new AuthenticationError('API key authentication required');
    }

    if (!scopes.includes(req.apiKey.scope)) {
      throw new AuthorizationError('Insufficient API key permissions');
    }

    next();
  };
};

/**
 * Resource Ownership Authorization Middleware
 */
export const authorizeOwnership = (resourceUserIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Admin can access all resources
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      throw new AuthorizationError('Access denied to this resource');
    }

    next();
  };
};
