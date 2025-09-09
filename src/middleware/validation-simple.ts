import { Request, Response, NextFunction } from 'express';

// Simple validation request helper
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Basic validation - can be enhanced
  next();
};
