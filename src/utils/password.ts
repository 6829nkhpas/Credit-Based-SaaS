import argon2 from 'argon2';
import bcrypt from 'bcrypt';
import { config } from '../config/environment';

export class PasswordService {
  /**
   * Hash password using Argon2 (recommended)
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      return await argon2.hash(password, {
        type: argon2.argon2id,
        timeCost: config.ARGON2_TIME_COST,
        memoryCost: config.ARGON2_MEMORY_COST,
        parallelism: config.ARGON2_PARALLELISM,
      });
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password using Argon2
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      return false;
    }
  }

  /**
   * Hash password using bcrypt (fallback)
   */
  static async hashPasswordBcrypt(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, config.BCRYPT_ROUNDS);
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password using bcrypt
   */
  static async verifyPasswordBcrypt(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if password meets security requirements
   */
  static isPasswordStrong(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
