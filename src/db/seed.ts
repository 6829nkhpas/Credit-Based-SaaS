import { PrismaClient } from '@prisma/client';
import { PasswordService } from '../utils/password';
import { TokenService } from '../utils/token';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await PasswordService.hashPassword('Admin123!@#');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      credits: 10000,
      isActive: true,
      emailVerified: true,
    },
  });

  logger.info('👑 Admin user created:', { email: adminUser.email, id: adminUser.id });

  // Create test user
  const userPassword = await PasswordService.hashPassword('User123!@#');
  const testUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: userPassword,
      name: 'Test User',
      role: 'USER',
      credits: 50,
      isActive: true,
      emailVerified: true,
    },
  });

  logger.info('👤 Test user created:', { email: testUser.email, id: testUser.id });

  // Create API key for test user
  const apiKey = TokenService.generateApiKey();
  const createdApiKey = await prisma.apiKey.create({
    data: {
      key: apiKey,
      name: 'Test API Key',
      scope: 'READ_ONLY',
      userId: testUser.id,
      isActive: true,
    },
  });

  logger.info('🔑 API key created:', { 
    key: createdApiKey.key, 
    userId: testUser.id,
    scope: createdApiKey.scope 
  });

  // Create service user
  const serviceUser = await prisma.user.upsert({
    where: { email: 'service@example.com' },
    update: {},
    create: {
      email: 'service@example.com',
      name: 'Service User',
      role: 'SERVICE',
      credits: 1000,
      isActive: true,
      emailVerified: true,
    },
  });

  logger.info('🤖 Service user created:', { email: serviceUser.email, id: serviceUser.id });

  // Create service API key
  const serviceApiKey = TokenService.generateApiKey();
  const createdServiceApiKey = await prisma.apiKey.create({
    data: {
      key: serviceApiKey,
      name: 'Service API Key',
      scope: 'WRITE_ONLY',
      userId: serviceUser.id,
      isActive: true,
    },
  });

  logger.info('🔑 Service API key created:', { 
    key: createdServiceApiKey.key, 
    userId: serviceUser.id,
    scope: createdServiceApiKey.scope 
  });

  logger.info('✅ Database seed completed successfully!');
  
  console.log('\n📝 Seed Summary:');
  console.log('================');
  console.log(`Admin User: ${adminUser.email} (Password: Admin123!@#)`);
  console.log(`Test User: ${testUser.email} (Password: User123!@#)`);
  console.log(`Test API Key: ${createdApiKey.key}`);
  console.log(`Service User: ${serviceUser.email}`);
  console.log(`Service API Key: ${createdServiceApiKey.key}`);
  console.log('================\n');
}

main()
  .catch((e) => {
    logger.error('❌ Database seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
