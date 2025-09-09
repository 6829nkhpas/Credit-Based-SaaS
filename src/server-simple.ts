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
