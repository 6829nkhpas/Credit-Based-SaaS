import { User as PrismaUser, UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: UserRole;
      name: string;
      isActive: boolean;
    }

    interface Request {
      user?: User;
      apiKey?: {
        id: string;
        scope: string;
        userId: string;
      };
    }
  }
}

export {};
