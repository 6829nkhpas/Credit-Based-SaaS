import { database } from '../db/connection';
import { 
  User, 
  RefreshToken, 
  ApiKey, 
  AuditLog, 
  File, 
  Report, 
  Payment, 
  BlockchainTransaction 
} from '../models';

beforeAll(async () => {
  // Connect to test database
  await database.connect();
});

afterAll(async () => {
  await database.disconnect();
});

beforeEach(async () => {
  // Clean up database before each test
  await BlockchainTransaction.deleteMany({});
  await AuditLog.deleteMany({});
  await Payment.deleteMany({});
  await Report.deleteMany({});
  await File.deleteMany({});
  await ApiKey.deleteMany({});
  await RefreshToken.deleteMany({});
  await User.deleteMany({});
});

export { database };
