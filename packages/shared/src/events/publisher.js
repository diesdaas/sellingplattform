import amqp from 'amqplib';
import logger from '../utils/logger.js';
import { EXCHANGE_NAME, EventPriority } from './eventTypes.js';

class EventPublisher {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.connected = false;
  }

  async connect(url = process.env.RABBITMQ_URL || 'amqp://localhost') {
    try {
      if (this.connected) return;

      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      // Create exchange
      await this.channel.assertExchange(EXCHANGE_NAME, 'topic', {
        durable: true
      });

      this.connected = true;
      logger.info('Event publisher connected to RabbitMQ');

      // Handle connection close
      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.connected = false;
        // Auto-reconnect after delay
        setTimeout(() => this.connect(url), 5000);
      });

      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', { error: err.message });
        this.connected = false;
      });

    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', { error: error.message });
      this.connected = false;
      throw error;
    }
  }

  async publish(eventType, data, options = {}) {
    try {
      if (!this.connected) {
        throw new Error('Event publisher not connected to RabbitMQ');
      }

      const {
        priority = EventPriority.NORMAL,
        persistent = true,
        userId,
        correlationId,
        headers = {}
      } = options;

      const message = {
        eventType,
        data,
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: process.env.SERVICE_NAME || 'unknown-service'
      };

      // Add optional fields
      if (userId) message.userId = userId;
      if (correlationId) message.correlationId = correlationId;

      const messageBuffer = Buffer.from(JSON.stringify(message));

      // Publish to exchange with routing key
      await this.channel.publish(EXCHANGE_NAME, eventType, messageBuffer, {
        persistent,
        priority: this.getPriorityValue(priority),
        headers: {
          ...headers,
          'x-event-type': eventType,
          'x-timestamp': message.timestamp
        },
        messageId: correlationId || this.generateMessageId(),
        timestamp: Date.now()
      });

      logger.info(`Event published: ${eventType}`, {
        eventType,
        userId,
        correlationId,
        priority
      });

    } catch (error) {
      logger.error(`Failed to publish event: ${eventType}`, {
        error: error.message,
        eventType,
        data: JSON.stringify(data).slice(0, 200) // Truncate for logging
      });
      throw error;
    }
  }

  async publishBatch(events) {
    const promises = events.map(event =>
      this.publish(event.type, event.data, event.options)
    );

    await Promise.allSettled(promises);
  }

  // Helper methods for common events
  async publishUserEvent(type, userId, userData, options = {}) {
    await this.publish(type, { userId, user: userData }, {
      ...options,
      userId,
      headers: { 'x-entity-type': 'user', ...options.headers }
    });
  }

  async publishOrderEvent(type, orderId, orderData, options = {}) {
    await this.publish(type, { orderId, order: orderData }, {
      ...options,
      headers: { 'x-entity-type': 'order', ...options.headers }
    });
  }

  async publishPaymentEvent(type, paymentId, paymentData, options = {}) {
    await this.publish(type, { paymentId, payment: paymentData }, {
      ...options,
      headers: { 'x-entity-type': 'payment', ...options.headers }
    });
  }

  async publishProductEvent(type, productId, productData, options = {}) {
    await this.publish(type, { productId, product: productData }, {
      ...options,
      headers: { 'x-entity-type': 'product', ...options.headers }
    });
  }

  getPriorityValue(priority) {
    const values = {
      [EventPriority.LOW]: 0,
      [EventPriority.NORMAL]: 1,
      [EventPriority.HIGH]: 2,
      [EventPriority.CRITICAL]: 3
    };
    return values[priority] || 1;
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.connected = false;
      logger.info('Event publisher disconnected from RabbitMQ');
    } catch (error) {
      logger.error('Error closing event publisher connection', { error: error.message });
    }
  }
}

// Singleton instance
const eventPublisher = new EventPublisher();

export default eventPublisher;

// Graceful shutdown
process.on('SIGINT', async () => {
  await eventPublisher.close();
});

process.on('SIGTERM', async () => {
  await eventPublisher.close();
});
