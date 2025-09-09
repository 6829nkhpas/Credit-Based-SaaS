import { database } from './connection';
import { User, ApiKey } from '../models';
import { PasswordService } from '../utils/password';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

async function main() {
  logger.info('🌱 Starting database seed...');

  // Connect to database
  await database.connect();

  // Create admin user
  const adminPassword = await PasswordService.hashPassword('Admin123!@#');
  
  // Check if admin already exists
  let adminUser = await User.findOne({ email: 'admin@example.com' });
  
  if (!adminUser) {
    adminUser = new User({
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      credits: 10000,
      isActive: true,
      isEmailVerified: true,
    });
    await adminUser.save();
  }

  logger.info('👑 Admin user created:', { email: adminUser.email, id: adminUser.id });

  // Create test user
  const userPassword = await PasswordService.hashPassword('User123!@#');
  
  let testUser = await User.findOne({ email: 'user@example.com' });
  
  if (!testUser) {
    testUser = new User({
      email: 'user@example.com',
      password: userPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      credits: 100,
      isActive: true,
      isEmailVerified: true,
    });
    await testUser.save();
  }

  logger.info('👤 Test user created:', { email: testUser.email, id: testUser.id });

  // Create sample API key for test user
  const apiKeyValue = `cs_${crypto.randomBytes(32).toString('hex')}`;
  const apiKeyHash = await PasswordService.hashPassword(apiKeyValue);
  
  let apiKey = await ApiKey.findOne({ userId: testUser.id.toString(), name: 'Test API Key' });
  
  if (!apiKey) {
    apiKey = new ApiKey({
      name: 'Test API Key',
      keyHash: apiKeyHash,
      keyPrefix: apiKeyValue.substring(0, 8),
      userId: testUser.id.toString(),
      isActive: true,
      permissions: ['upload_file', 'generate_report', 'export_report'],
    });
    await apiKey.save();
  }

  logger.info('🔑 API key created:', { 
    userId: testUser.id, 
    keyPrefix: apiKey.keyPrefix,
    fullKey: apiKeyValue // Only shown during seeding for testing
  });

  // Create sample OAuth users
  let googleUser = await User.findOne({ email: 'googleuser@example.com' });
  
  if (!googleUser) {
    googleUser = new User({
      email: 'googleuser@example.com',
      firstName: 'Google',
      lastName: 'User',
      role: 'USER',
      credits: 50,
      isActive: true,
      isEmailVerified: true,
      googleId: '123456789',
    });
    await googleUser.save();
  }

  logger.info('🔗 Google OAuth user created:', { email: googleUser.email });

  let githubUser = await User.findOne({ email: 'githubuser@example.com' });
  
  if (!githubUser) {
    githubUser = new User({
      email: 'githubuser@example.com',
      firstName: 'GitHub',
      lastName: 'User',
      role: 'USER',
      credits: 75,
      isActive: true,
      isEmailVerified: true,
      githubId: '987654321',
    });
    await githubUser.save();
  }

  logger.info('🔗 GitHub OAuth user created:', { email: githubUser.email });

  logger.info('✅ Database seeding completed successfully!');
  
  // Summary
  const userCount = await User.countDocuments();
  const apiKeyCount = await ApiKey.countDocuments();
  
  logger.info('📊 Seeding Summary:', {
    totalUsers: userCount,
    totalApiKeys: apiKeyCount,
    adminUser: adminUser.email,
    testCredentials: {
      admin: { email: 'admin@example.com', password: 'Admin123!@#' },
      user: { email: 'user@example.com', password: 'User123!@#' },
      apiKey: apiKeyValue
    }
  });
}

async function cleanup() {
  logger.info('🧹 Starting database cleanup...');
  
  await database.connect();
  
  // Remove all test data
  await ApiKey.deleteMany({});
  await User.deleteMany({});
  
  logger.info('✅ Database cleanup completed!');
}

// Run seeding
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'clean') {
    cleanup()
      .then(() => process.exit(0))
      .catch((error) => {
        logger.error('❌ Cleanup failed:', error);
        process.exit(1);
      });
  } else {
    main()
      .then(() => process.exit(0))
      .catch((error) => {
        logger.error('❌ Seeding failed:', error);
        process.exit(1);
      });
  }
}
