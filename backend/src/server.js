import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';
import { initSocket } from './sockets/index.js';

const server = http.createServer(app);
initSocket(server);

async function start() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');

    server.listen(env.port, () => {
      logger.info(`🚀 Server running on port ${env.port} [${env.nodeEnv}]`);
    });
  } catch (err) {
    logger.error('❌ Failed to start server', { error: err.message });
    process.exit(1);
  }
}

const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
