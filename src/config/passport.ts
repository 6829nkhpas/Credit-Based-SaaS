import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { config } from './environment';
import { User, ApiKey, AuditLog, File, Report, Payment, BlockchainTransaction } from '../models';
import { logger } from '../utils/logger';

export const initializePassport = () => {
  // Google OAuth Strategy
  if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.GOOGLE_CLIENT_ID,
          clientSecret: config.GOOGLE_CLIENT_SECRET,
          callbackURL: '/api/auth/google/callback',
        },
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email found in Google profile'));
            }

            // Check if user exists
            let user = await prisma.user.findUnique({
              where: { email },
            });

            if (user) {
              // Update Google ID if not set
              if (!user.googleId) {
                user = await prisma.user.update({
                  where: { id: user.id },
                  data: { googleId: profile.id },
                });
              }
            } else {
              // Create new user
              user = await prisma.user.create({
                data: {
                  email,
                  name: profile.displayName || 'Unknown',
                  googleId: profile.id,
                  emailVerified: true, // Google emails are pre-verified
                  credits: 50, // Initial credits
                },
              });
            }

            // Update last login
            await prisma.user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            });

            logger.info('Google OAuth login successful', { userId: user.id, email: user.email });
            return done(null, user);
          } catch (error) {
            logger.error('Google OAuth error', { error });
            return done(error);
          }
        }
      )
    );
  }

  // GitHub OAuth Strategy
  if (config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: config.GITHUB_CLIENT_ID,
          clientSecret: config.GITHUB_CLIENT_SECRET,
          callbackURL: '/api/auth/github/callback',
        },
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email found in GitHub profile'));
            }

            // Check if user exists
            let user = await prisma.user.findUnique({
              where: { email },
            });

            if (user) {
              // Update GitHub ID if not set
              if (!user.githubId) {
                user = await prisma.user.update({
                  where: { id: user.id },
                  data: { githubId: profile.id },
                });
              }
            } else {
              // Create new user
              user = await prisma.user.create({
                data: {
                  email,
                  name: profile.displayName || profile.username || 'Unknown',
                  githubId: profile.id,
                  emailVerified: true, // GitHub emails are pre-verified
                  credits: 50, // Initial credits
                },
              });
            }

            // Update last login
            await prisma.user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            });

            logger.info('GitHub OAuth login successful', { userId: user.id, email: user.email });
            return done(null, user);
          } catch (error) {
            logger.error('GitHub OAuth error', { error });
            return done(error);
          }
        }
      )
    );
  }

  // JWT Strategy (for protected routes)
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: config.JWT_ACCESS_SECRET,
      },
      async (payload, done) => {
        try {
          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
            },
          });

          if (user && user.isActive) {
            return done(null, user);
          }

          return done(null, false);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
};
