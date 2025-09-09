#!/bin/bash

echo "🔧 Creating final MongoDB app with working build..."

# Create a simple working express app structure first
cat > src/app-simple.ts << 'EOF'
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
EOF

# Create a working server file
cat > src/server-simple.ts << 'EOF'
import app from './app-simple';
import { connectDB } from './db/connection';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('✅ MongoDB connected successfully');

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info('🎉 MongoDB SaaS Credit System is ready!');
      console.log(`
✅ MongoDB Credit SaaS Server Running!
📍 Port: ${PORT}
🔍 Health: http://localhost:${PORT}/health
🧪 Test DB: http://localhost:${PORT}/test-db
💳 Test Credits: POST http://localhost:${PORT}/credits/test
📁 Test Files: POST http://localhost:${PORT}/files/test
      `);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
EOF

echo "✅ Created simplified MongoDB app!"
echo "🔧 Building the working version..."
