import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { validate, authSchemas } from '../middleware/validation';
import { PasswordService } from '../utils/password';
import { TokenService } from '../utils/token';
import { User, RefreshToken } from '../models';
import { AuthenticationError, ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Sign up with email and password
 */
router.post('/signup', validate(authSchemas.signup), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Validate password strength
    const passwordValidation = PasswordService.isPasswordStrong(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password does not meet requirements', passwordValidation.errors);
    }

    // Hash password
    const hashedPassword = await PasswordService.hashPassword(password);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      firstName: name || '',
      credits: 50, // Initial credits
    });

    await user.save();

    // Generate tokens
    const accessToken = TokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = TokenService.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token
    await TokenService.storeRefreshToken(user.id, refreshToken);

    logger.info('User signed up successfully', { userId: user.id, email: user.email });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''}`.trim(),
        role: user.role,
        credits: user.credits,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Login with email and password
 */
router.post('/login', validate(authSchemas.login), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user || !user.password) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is disabled');
    }

    // Verify password
    const isPasswordValid = await PasswordService.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    await User.findByIdAndUpdate(user.id, { lastLoginAt: new Date() });

    // Generate tokens
    const accessToken = TokenService.generateAccessToken({
      userId: user.id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = TokenService.generateRefreshToken({
      userId: user.id.toString(),
      email: user.email,
      role: user.role,
    });

    // Store refresh token
    await TokenService.storeRefreshToken(user.id.toString(), refreshToken);

    logger.info('User logged in successfully', { userId: user.id, email: user.email });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        role: user.role,
        credits: user.credits,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Refresh access token
 */
router.post('/refresh', validate(authSchemas.refreshToken), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    const payload = TokenService.verifyRefreshToken(refreshToken);

    // Check if token is valid in database
    const isValid = await TokenService.isRefreshTokenValid(refreshToken);
    if (!isValid) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Get user
    const user = await User.findOne({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    // Revoke old refresh token
    await TokenService.revokeRefreshToken(refreshToken);

    // Generate new tokens
    const newAccessToken = TokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = TokenService.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Store new refresh token
    await TokenService.storeRefreshToken(user.id, newRefreshToken);

    res.json({
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Logout (revoke refresh token)
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await TokenService.revokeRefreshToken(refreshToken);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * Google OAuth login
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

/**
 * Google OAuth callback
 */
router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;

      // Generate tokens
      const accessToken = TokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = TokenService.generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Store refresh token
      await TokenService.storeRefreshToken(user.id, refreshToken);

      // Redirect to client with tokens (in a real app, use secure cookies or redirect to client)
      res.redirect(`${process.env.CLIENT_URL}/auth/success?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GitHub OAuth login
 */
router.get('/github', passport.authenticate('github', {
  scope: ['user:email'],
}));

/**
 * GitHub OAuth callback
 */
router.get('/github/callback',
  passport.authenticate('github', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;

      // Generate tokens
      const accessToken = TokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = TokenService.generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Store refresh token
      await TokenService.storeRefreshToken(user.id, refreshToken);

      // Redirect to client with tokens
      res.redirect(`${process.env.CLIENT_URL}/auth/success?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } catch (error) {
      next(error);
    }
  }
);

export { router as authRoutes };
