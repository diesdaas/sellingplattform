import { createClient } from 'redis';
import tokenService from './tokenService.js';
import { logger } from '@gocart/shared';

class SessionService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.prefix = 'session:';
  }

  async connect() {
    if (this.connected) return;

    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis session client error', { error: err.message });
        this.connected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis session client connected');
        this.connected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis session client disconnected');
        this.connected = false;
      });

      await this.client.connect();

    } catch (error) {
      logger.error('Failed to connect to Redis for sessions', { error: error.message });
      throw error;
    }
  }

  // Create a new session
  async createSession(user, device = 'web', metadata = {}) {
    try {
      await this.connect();

      const { sessionId, sessionToken } = tokenService.generateSessionToken(user, device);
      const sessionKey = `${this.prefix}${sessionId}`;

      const sessionData = {
        userId: user.id,
        email: user.email,
        role: user.role,
        device,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ...metadata
      };

      // Store session data in Redis (30 days expiration)
      await this.client.setEx(sessionKey, 30 * 24 * 60 * 60, JSON.stringify(sessionData));

      // Store session ID in user sessions set for cleanup
      await this.client.sAdd(`user_sessions:${user.id}`, sessionId);

      logger.info('Session created', {
        sessionId,
        userId: user.id,
        device
      });

      return { sessionId, sessionToken, sessionData };

    } catch (error) {
      logger.error('Failed to create session', {
        error: error.message,
        userId: user.id
      });
      throw error;
    }
  }

  // Get session by ID
  async getSession(sessionId) {
    try {
      await this.connect();

      const sessionKey = `${this.prefix}${sessionId}`;
      const sessionData = await this.client.get(sessionKey);

      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData);

      // Update last activity
      session.lastActivity = new Date().toISOString();
      await this.client.setEx(sessionKey, 30 * 24 * 60 * 60, JSON.stringify(session));

      return session;

    } catch (error) {
      logger.error('Failed to get session', {
        error: error.message,
        sessionId
      });
      return null;
    }
  }

  // Validate session token and return session data
  async validateSessionToken(token) {
    try {
      const decoded = tokenService.verifySessionToken(token);
      const session = await this.getSession(decoded.sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      // Check if session belongs to the user
      if (session.userId !== decoded.userId) {
        throw new Error('Session user mismatch');
      }

      return session;

    } catch (error) {
      logger.warn('Session validation failed', {
        error: error.message,
        token: token.substring(0, 20) + '...'
      });
      return null;
    }
  }

  // Destroy session
  async destroySession(sessionId) {
    try {
      await this.connect();

      const sessionKey = `${this.prefix}${sessionId}`;
      const sessionData = await this.client.get(sessionKey);

      if (sessionData) {
        const session = JSON.parse(sessionData);

        // Remove from user sessions set
        await this.client.sRem(`user_sessions:${session.userId}`, sessionId);

        // Delete session
        await this.client.del(sessionKey);

        logger.info('Session destroyed', { sessionId, userId: session.userId });
      }

    } catch (error) {
      logger.error('Failed to destroy session', {
        error: error.message,
        sessionId
      });
      throw error;
    }
  }

  // Destroy all sessions for a user
  async destroyUserSessions(userId) {
    try {
      await this.connect();

      // Get all session IDs for user
      const sessionIds = await this.client.sMembers(`user_sessions:${userId}`);

      if (sessionIds.length > 0) {
        // Delete all sessions
        const sessionKeys = sessionIds.map(id => `${this.prefix}${id}`);
        await this.client.del(sessionKeys);

        // Delete user sessions set
        await this.client.del(`user_sessions:${userId}`);

        logger.info('All user sessions destroyed', {
          userId,
          sessionCount: sessionIds.length
        });
      }

    } catch (error) {
      logger.error('Failed to destroy user sessions', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Get active sessions for a user
  async getUserSessions(userId) {
    try {
      await this.connect();

      const sessionIds = await this.client.sMembers(`user_sessions:${userId}`);
      const sessions = [];

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session) {
          sessions.push({ sessionId, ...session });
        }
      }

      return sessions;

    } catch (error) {
      logger.error('Failed to get user sessions', {
        error: error.message,
        userId
      });
      return [];
    }
  }

  // Clean expired sessions (maintenance function)
  async cleanExpiredSessions() {
    try {
      await this.connect();

      // This is handled automatically by Redis TTL
      // But we can add custom cleanup logic here if needed
      logger.info('Session cleanup completed');

    } catch (error) {
      logger.error('Session cleanup failed', { error: error.message });
    }
  }

  // Get session statistics
  async getSessionStats() {
    try {
      await this.connect();

      const keys = await this.client.keys(`${this.prefix}*`);
      const userSessionKeys = await this.client.keys('user_sessions:*');

      return {
        totalSessions: keys.length,
        totalUsers: userSessionKeys.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get session stats', { error: error.message });
      return { totalSessions: 0, totalUsers: 0 };
    }
  }

  async close() {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
      logger.info('Redis session client closed');
    }
  }
}

export default new SessionService();
