import { Request, Response, NextFunction } from 'express';

// Simple validation request helper
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Basic validation - can be enhanced
  next();
};
      }
    }

    // Validate params
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      }
    }

    // Validate query
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }

    next();
  };
};

// Common validation schemas
export const authSchemas = {
  signup: {
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      name: Joi.string().min(2).max(100).required(),
    }),
  },
  
  login: {
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    }),
  },
  
  refreshToken: {
    body: Joi.object({
      refreshToken: Joi.string().required(),
    }),
  },
  
  forgotPassword: {
    body: Joi.object({
      email: Joi.string().email().required(),
    }),
  },
  
  resetPassword: {
    body: Joi.object({
      token: Joi.string().required(),
      password: Joi.string().min(8).required(),
    }),
  },
};

export const userSchemas = {
  uploadFile: {
    body: Joi.object({
      filename: Joi.string().max(255).optional(),
    }),
  },
  
  generateReport: {
    body: Joi.object({
      title: Joi.string().min(1).max(255).required(),
      description: Joi.string().max(1000).optional(),
      fileId: Joi.string().uuid().optional(),
      metadata: Joi.object().optional(),
    }),
  },
  
  downloadReport: {
    params: Joi.object({
      reportId: Joi.string().uuid().required(),
    }),
  },
  
  updateProfile: {
    body: Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      email: Joi.string().email().optional(),
    }),
  },
  
  changePassword: {
    body: Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(8).required(),
    }),
  },
};

export const adminSchemas = {
  addCredits: {
    body: Joi.object({
      userId: Joi.string().uuid().required(),
      amount: Joi.number().integer().min(1).max(10000).required(),
      reason: Joi.string().max(255).optional(),
    }),
  },
  
  createApiKey: {
    body: Joi.object({
      userId: Joi.string().uuid().required(),
      name: Joi.string().min(1).max(100).required(),
      scope: Joi.string().valid('READ_ONLY', 'WRITE_ONLY', 'ADMIN').required(),
      expiresAt: Joi.date().greater('now').optional(),
    }),
  },
  
  revokeApiKey: {
    params: Joi.object({
      keyId: Joi.string().uuid().required(),
    }),
  },
  
  updateUser: {
    params: Joi.object({
      userId: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      email: Joi.string().email().optional(),
      role: Joi.string().valid('USER', 'ADMIN', 'SERVICE').optional(),
      isActive: Joi.boolean().optional(),
      credits: Joi.number().integer().min(0).optional(),
    }),
  },
  
  getAuditLogs: {
    query: Joi.object({
      userId: Joi.string().uuid().optional(),
      action: Joi.string().optional(),
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
      limit: Joi.number().integer().min(1).max(100).default(50),
      offset: Joi.number().integer().min(0).default(0),
    }),
  },
};

export const serviceSchemas = {
  fetchMetadata: {
    params: Joi.object({
      resourceId: Joi.string().uuid().required(),
    }),
    query: Joi.object({
      type: Joi.string().valid('file', 'report').required(),
    }),
  },
};

export const paymentSchemas = {
  createPaymentIntent: {
    body: Joi.object({
      amount: Joi.number().min(1).max(10000).required(), // USD amount
      credits: Joi.number().integer().min(1).max(100000).required(),
      provider: Joi.string().valid('stripe', 'razorpay').required(),
    }),
  },
  
  confirmPayment: {
    body: Joi.object({
      paymentIntentId: Joi.string().required(),
      provider: Joi.string().valid('stripe', 'razorpay').required(),
    }),
  },
};

// Common parameter schemas
export const commonSchemas = {
  uuid: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  },
  
  pagination: {
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(100).default(20),
      offset: Joi.number().integer().min(0).default(0),
      sortBy: Joi.string().optional(),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    }),
  },
};
