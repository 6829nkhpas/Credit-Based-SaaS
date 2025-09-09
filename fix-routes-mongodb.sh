#!/bin/bash

echo "🔧 Fixing MongoDB syntax in route files..."

# Create backup
cp -r src/routes src/routes.backup

# Fix Prisma-style queries to MongoDB queries
find src/routes -name "*.ts" -exec sed -i '
# Fix findUnique to findOne
s/\.findUnique(/\.findOne(/g

# Fix Prisma include syntax to populate
s/include: {/populate: {/g

# Fix Prisma select syntax
s/select: {/select: "/g
s/select: "/select: "\&/g

# Fix where clause syntax
s/{ id: /{ _id: /g

# Fix create syntax
s/\.create({/\.create(/g
s/data: {//g

# Fix update syntax
s/\.update({/\.findByIdAndUpdate(/g
s/\.findByIdAndUpdate({ { /\.findByIdAndUpdate(/g

# Fix delete syntax
s/\.delete({/\.findByIdAndDelete(/g

# Fix orderBy to sort
s/orderBy: { /sort: { /g
s/orderBy:/sort:/g

# Fix take/skip to limit/skip
s/take: /limit: /g

# Fix count
s/\.count({/\.countDocuments(/g

# Fix array syntax issues
s/countDocuments({ {/countDocuments({/g

# Clean up extra brackets and commas
s/{ {/{/g
s/} }/}/g
s/},$/}/g

# Fix common Prisma patterns
s/gt:/\$gt:/g
s/gte:/\$gte:/g
s/lt:/\$lt:/g
s/lte:/\$lte:/g
s/contains:/\$regex:/g

' {} \;

echo "✅ MongoDB route syntax updated!"

# Fix specific authentication middleware issues
cat > src/middleware/auth.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, ApiKey } from '../models';
import { AuthenticationError } from '../utils/errors';

interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        name: string;
        isActive: boolean;
      };
      apiKey?: {
        id: string;
        scope: string;
        userId: string;
      };
    }
  }
}

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    
    // Find user in database
    const user = await User.findById(decoded.userId).select('id email role name isActive');

    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid or inactive user');
    }

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
      id: key._id.toString(),
      scope: key.scope,
      userId: key.userId._id.toString(),
    };

    // Add user info to request
    const user = key.userId as any;
    req.user = {
      id: user._id.toString(),
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
EOF

echo "✅ Authentication middleware fixed!"

echo "🎉 MongoDB route migration completed!"
