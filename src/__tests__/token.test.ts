import { TokenService } from '../utils/token';
import { config } from '../config/environment';

describe('TokenService', () => {
  const mockUser = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'USER',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = TokenService.generateAccessToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(50);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = TokenService.generateRefreshToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(50);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = TokenService.generateAccessToken(mockUser);
      const decoded = TokenService.verifyAccessToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockUser.userId);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
      expect(decoded.type).toBe('access');
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        TokenService.verifyAccessToken(invalidToken);
      }).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = TokenService.generateRefreshToken(mockUser);
      const decoded = TokenService.verifyRefreshToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockUser.userId);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
      expect(decoded.type).toBe('refresh');
    });
  });

  describe('generateApiKey', () => {
    it('should generate a unique API key', () => {
      const key1 = TokenService.generateApiKey();
      const key2 = TokenService.generateApiKey();
      
      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
      expect(key1).toMatch(/^sk_/);
      expect(key2).toMatch(/^sk_/);
    });
  });
});
