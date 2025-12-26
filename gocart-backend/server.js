import app from './src/index.js';
import { config, validateEnv } from './config/env.js';
import { connectDatabase } from './config/database-pg.js';

// Validate environment variables
validateEnv();

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    const PORT = config.server.port || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Modular Backend Server running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${config.server.nodeEnv}`);
      console.log(`🗄️  Database: Connected`);
      console.log(`📦 Modules: catalog, order, media, notification`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

