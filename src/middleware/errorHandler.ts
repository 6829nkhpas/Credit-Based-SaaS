import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      details: error.details || [],
    });
    return;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid token',
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Authentication Error',
      message: 'Token expired',
    });
    return;
  }

  // Prisma errors
  if (error.code === 'P2002') {
    res.status(409).json({
      error: 'Conflict',
      message: 'Resource already exists',
    });
    return;
  }

  if (error.code === 'P2025') {
    res.status(404).json({
      error: 'Not Found',
      message: 'Resource not found',
    });
    return;
  }

  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: 'File Too Large',
      message: 'File size exceeds limit',
    });
    return;
  }

  // Default error
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : 'Error',
    message: statusCode >= 500 ? 'Something went wrong' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};
