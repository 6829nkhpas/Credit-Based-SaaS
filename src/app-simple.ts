import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './db/connection';
import { User, File, Report, ApiKey, RefreshToken, AuditLog, Payment, BlockchainTransaction } from './models';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Test MongoDB connection
app.get('/test-db', async (req, res) => {
  try {
    // Test user creation
    const testUser = await User.create({
      email: 'test@example.com',
      firstName: 'Test User',
      password: 'hashedpassword123',
      credits: 100
    });

    res.json({ 
      success: true, 
      message: 'MongoDB connection working!',
      testUser: {
        id: testUser._id,
        email: testUser.email,
        credits: testUser.credits
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Credit operations endpoint
app.post('/credits/test', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        firstName: 'New User',
        password: 'placeholder',
        credits: 50
      });
    }

    // Test credit operations
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $inc: { credits: 10 } },
      { new: true }
    );

    res.json({
      success: true,
      user: {
        id: updatedUser!._id,
        email: updatedUser!.email,
        credits: updatedUser!.credits
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// File operations endpoint
app.post('/files/test', async (req, res) => {
  try {
    const { userId, fileName } = req.body;

    const file = await File.create({
      userId,
      fileName,
      originalName: fileName,
      mimeType: 'text/plain',
      size: 1024,
      content: Buffer.from('test content'),
    });

    res.json({
      success: true,
      file: {
        id: file._id,
        fileName: file.fileName,
        size: file.size,
        createdAt: file.createdAt
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;
