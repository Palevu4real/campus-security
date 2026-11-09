import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { verifyAccessToken } from '../utils/tokens.js';

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  // Auth middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Allow anonymous connections — they just can't join admin room
      socket.user = null;
      return next();
    }
    try {
      const payload = verifyAccessToken(token);
      socket.user = { id: payload.sub, role: payload.role };
      return next();
    } catch {
      socket.user = null;
      return next();
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`, {
      userId: socket.user?.id,
      role: socket.user?.role,
    });

    // Client asks to join admin alert room.
    // SERVER decides — client cannot self-promote.
    socket.on('join:admin', () => {
      if (
        socket.user &&
        (socket.user.role === 'ADMIN' || socket.user.role === 'SUPER_ADMIN')
      ) {
        socket.join('admin:alerts');
        logger.info(`✅ Socket ${socket.id} joined admin:alerts`, {
          userId: socket.user.id,
        });
        socket.emit('admin:joined', { success: true });
      } else {
        logger.warn(`❌ Socket ${socket.id} denied admin:alerts`, {
          userId: socket.user?.id,
        });
        socket.emit('admin:joined', {
          success: false,
          error: 'Insufficient permissions',
        });
      }
    });

    // Client subscribes to their OWN alert stream (e.g. to see "your account was locked")
    socket.on('join:user', () => {
      if (socket.user?.id) {
        socket.join(`user:${socket.user.id}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}