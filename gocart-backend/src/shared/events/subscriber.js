import amqp from 'amqplib';
import { Queues, EXCHANGE_NAME } from '@gocart/shared';
import { logger } from '@gocart/shared';

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
      await this.channel.bindQueue(queue.queue, EXCHANGE_NAME, '#'); // Receive all events

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

  // Unsubscribe from a queue
  async unsubscribe(queueName) {
    try {
      const consumerTag = this.consumers.get(queueName);
      if (consumerTag && this.channel) {
        await this.channel.cancel(consumerTag);
        this.consumers.delete(queueName);
        logger.info(`Unsubscribed from queue: ${queueName}`);
      }
    } catch (error) {
      logger.error(`Failed to unsubscribe from queue: ${queueName}`, {
        error: error.message
      });
    }
  }

  // Subscribe to notifications queue
  async subscribeToNotifications() {
    await this.subscribe(Queues.NOTIFICATIONS, this.handleNotificationEvent.bind(this));
  }

  // Subscribe to analytics queue
  async subscribeToAnalytics() {
    await this.subscribe(Queues.ANALYTICS, this.handleAnalyticsEvent.bind(this));
  }

  // Subscribe to order processing queue
  async subscribeToOrderProcessing() {
    await this.subscribe(Queues.ORDER_PROCESSING, this.handleOrderProcessingEvent.bind(this));
  }

  // Event handlers
  async handleNotificationEvent(eventData, msg) {
    const { eventType, data, timestamp } = eventData;

    logger.info(`Processing notification event: ${eventType}`, { data, timestamp });

    // TODO: Implement notification logic based on event type
    switch (eventType) {
      case 'user.created':
        // Send welcome email
        break;
      case 'order.placed':
        // Send order confirmation
        break;
      case 'payment.succeeded':
        // Send payment confirmation
        break;
      default:
        logger.debug(`Unhandled notification event: ${eventType}`);
    }
  }

  async handleAnalyticsEvent(eventData, msg) {
    const { eventType, data, timestamp } = eventData;

    logger.info(`Processing analytics event: ${eventType}`, { data, timestamp });

    // TODO: Implement analytics logic
    // This could write to analytics database, update metrics, etc.
  }

  async handleOrderProcessingEvent(eventData, msg) {
    const { eventType, data, timestamp } = eventData;

    logger.info(`Processing order event: ${eventType}`, { data, timestamp });

    // TODO: Implement order processing logic
    switch (eventType) {
      case 'order.placed':
        // Process order, update inventory, trigger fulfillment
        break;
      case 'payment.succeeded':
        // Mark order as paid, trigger shipping
        break;
      default:
        logger.debug(`Unhandled order processing event: ${eventType}`);
    }
  }

  // Initialize all subscriptions
  async initializeSubscriptions() {
    try {
      await Promise.all([
        this.subscribeToNotifications(),
        this.subscribeToAnalytics(),
        this.subscribeToOrderProcessing()
      ]);

      logger.info('All event subscriptions initialized');
    } catch (error) {
      logger.error('Failed to initialize event subscriptions', { error: error.message });
    }
  }

  async close() {
    try {
      // Cancel all consumers
      for (const [queueName, consumerTag] of this.consumers) {
        try {
          await this.unsubscribe(queueName);
        } catch (error) {
          logger.error(`Error unsubscribing from ${queueName}`, { error: error.message });
        }
      }

      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.connected = false;
      logger.info('Event subscriber disconnected from RabbitMQ');
    } catch (error) {
      logger.error('Error closing event subscriber connection', { error: error.message });
    }
  }
}

// Singleton instance
const eventSubscriber = new EventSubscriber();

export default eventSubscriber;

// Graceful shutdown
process.on('SIGINT', async () => {
  await eventSubscriber.close();
});

process.on('SIGTERM', async () => {
  await eventSubscriber.close();
});
