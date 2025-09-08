import { PasswordService } from '../utils/password';

describe('PasswordService', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'testPassword123!';
      const hash = await PasswordService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'testPassword123!';
      const hash = await PasswordService.hashPassword(password);
      
      const isValid = await PasswordService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'testPassword123!';
      const wrongPassword = 'wrongPassword123!';
      const hash = await PasswordService.hashPassword(password);
      
      const isValid = await PasswordService.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('isPasswordStrong', () => {
    it('should validate a strong password', () => {
      const strongPassword = 'StrongPass123!';
      const result = PasswordService.isPasswordStrong(strongPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a weak password', () => {
      const weakPassword = 'weak';
      const result = PasswordService.isPasswordStrong(weakPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should require uppercase letter', () => {
      const password = 'password123!';
      const result = PasswordService.isPasswordStrong(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require special character', () => {
      const password = 'Password123';
      const result = PasswordService.isPasswordStrong(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });
});
