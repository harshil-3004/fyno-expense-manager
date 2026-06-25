const config = require('./config');
const connectDB = require('./config/db');
const app = require('./app');

const startServer = async () => {
  // Connect to MongoDB Atlas
  await connectDB();

  app.listen(config.port, () => {
    console.log(`\n🚀 Fyno API Server running on port ${config.port}`);
    console.log(`📍 Environment: ${config.nodeEnv}`);
    console.log(`🔗 http://localhost:${config.port}/api/health\n`);
  });
};

startServer();
