import amqp from 'amqplib';
import { Queues, EXCHANGE_NAME } from '@gocart/shared';
import { logger } from '@gocart/shared';
import { query } from '../../../config/database-pg.js';

class EventSubscriber {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.connected = false;
    this.consumers = new Map();
  }

  async connect(url = process.env.RABBITMQ_URL || 'amqp://localhost') {
    try {
      if (this.connected) return;

      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      // Assert exchange
      await this.channel.assertExchange(EXCHANGE_NAME, 'topic', {
        durable: true
      });

      this.connected = true;
      logger.info('Event subscriber connected to RabbitMQ');

      // Handle connection close
      this.connection.on('close', () => {
        logger.warn('RabbitMQ subscriber connection closed');
        this.connected = false;
        // Auto-reconnect after delay
        setTimeout(() => this.connect(url), 5000);
      });

      this.connection.on('error', (err) => {
        logger.error('RabbitMQ subscriber connection error', { error: err.message });
        this.connected = false;
      });

    } catch (error) {
      logger.error('Failed to connect to RabbitMQ as subscriber', { error: error.message });
      this.connected = false;
      throw error;
    }
  }

  // Subscribe to a queue with a handler function
  async subscribe(queueName, handler, options = {}) {
    try {
      await this.connect();

      const {
        durable = true,
        autoDelete = false,
        prefetch = 1
      } = options;

      // Assert queue
      const queue = await this.channel.assertQueue(queueName, {
        durable,
        autoDelete
      });

      // Bind queue to exchange
      // For backend, we want to listen to user events, catalog events, etc.
      await this.channel.bindQueue(queue.queue, EXCHANGE_NAME, 'user.*');
      await this.channel.bindQueue(queue.queue, EXCHANGE_NAME, 'catalog.*');
      await this.channel.bindQueue(queue.queue, EXCHANGE_NAME, 'order.*');
      await this.channel.bindQueue(queue.queue, EXCHANGE_NAME, 'payment.*');

      // Set prefetch
      await this.channel.prefetch(prefetch);

      // Start consuming
      const consumerTag = await this.channel.consume(queue.queue, async (msg) => {
        if (msg) {
          try {
            const eventData = JSON.parse(msg.content.toString());
            await handler(eventData, msg);

            // Acknowledge message
            this.channel.ack(msg);

            logger.debug(`Event processed: ${eventData.eventType}`, {
              queue: queueName,
              messageId: msg.properties.messageId
            });

          } catch (error) {
            logger.error(`Failed to process event from queue ${queueName}`, {
              error: error.message,
              eventData: msg.content.toString(),
              messageId: msg.properties.messageId
            });

            // Reject message and requeue if it's a temporary error
            this.channel.nack(msg, false, error.isRetryable !== false);
          }
        }
      }, { noAck: false });

      this.consumers.set(queueName, consumerTag.consumerTag);
      logger.info(`Subscribed to queue: ${queueName}`, {
        consumerTag: consumerTag.consumerTag,
        prefetch
      });

      return consumerTag.consumerTag;
    } catch (error) {
      logger.error(`Failed to subscribe to queue: ${queueName}`, {
        error: error.message
      });
      throw error;
    }
  }

  // Event handlers
  async handleEvent(eventData, msg) {
    const { eventType, data, timestamp } = eventData;

    logger.info(`Processing event: ${eventType}`, { userId: data.userId });

    switch (eventType) {
      case 'user.created':
        await this.syncUser(data);
        break;
      case 'user.updated':
        await this.updateUser(data);
        break;
      default:
        logger.debug(`Unhandled event type: ${eventType}`);
    }
  }

  async syncUser(data) {
    try {
      const { userId, email, name, role } = data;
      
      // Check if user already exists in backend DB
      const existing = await query('SELECT id FROM "User" WHERE id = $1', [userId]);
      
      if (existing.rows.length === 0) {
        await query(
          'INSERT INTO "User" (id, email, name, role, "isArtist", "password", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW())',
          [userId, email, name, role, role === 'artist', 'external-auth',]
        );
        logger.info('User synced to backend database', { userId, email });
      }
    } catch (error) {
      logger.error('Failed to sync user to backend', { error: error.message, userId: data.userId });
    }
  }

  async updateUser(data) {
    try {
      const { userId, changes } = data;
      const fields = [];
      const params = [userId];
      let idx = 2;

      if (changes.name) {
        fields.push(`name = $${idx}`);
        params.push(changes.name);
        idx++;
      }
      if (changes.email) {
        fields.push(`email = $${idx}`);
        params.push(changes.email);
        idx++;
      }
      if (changes.role) {
        fields.push(`role = $${idx}`);
        params.push(changes.role);
        idx++;
        fields.push(`"isArtist" = $${idx}`);
        params.push(changes.role === 'artist');
        idx++;
      }

      if (fields.length > 0) {
        await query(
          `UPDATE "User" SET ${fields.join(', ')}, "updatedAt" = NOW() WHERE id = $1`,
          params
        );
        logger.info('User updated in backend database', { userId });
      }
    } catch (error) {
      logger.error('Failed to update user in backend', { error: error.message, userId: data.userId });
    }
  }

  // Initialize all subscriptions
  async initializeSubscriptions() {
    try {
      // Use a dedicated queue for the backend service
      const backendQueue = 'backend.events';
      await this.subscribe(backendQueue, this.handleEvent.bind(this));
      logger.info('Backend event subscriptions initialized');
    } catch (error) {
      logger.error('Failed to initialize event subscriptions', { error: error.message });
    }
  }

  async close() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      this.connected = false;
      logger.info('Event subscriber disconnected from RabbitMQ');
    } catch (error) {
      logger.error('Error closing event subscriber', { error: error.message });
    }
  }
}

const eventSubscriber = new EventSubscriber();
export default eventSubscriber;
