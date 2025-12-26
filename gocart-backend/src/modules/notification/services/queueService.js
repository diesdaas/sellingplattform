import amqp from 'amqplib';
import { Queues } from '@gocart/shared';
import emailService from './emailService.js';
import templateService from './templateService.js';
import { logger } from '@gocart/shared';

class QueueService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.connected = false;
    this.notificationQueue = 'gocart.notifications.direct';
  }

  async connect(url = process.env.RABBITMQ_URL || 'amqp://localhost') {
    try {
      if (this.connected) return;

      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      // Assert notification queue
      await this.channel.assertQueue(this.notificationQueue, {
        durable: true
      });

      this.connected = true;
      logger.info('Notification queue service connected to RabbitMQ');

      // Handle connection close
      this.connection.on('close', () => {
        logger.warn('RabbitMQ notification queue connection closed');
        this.connected = false;
        // Auto-reconnect after delay
        setTimeout(() => this.connect(url), 5000);
      });

      this.connection.on('error', (err) => {
        logger.error('RabbitMQ notification queue connection error', { error: err.message });
        this.connected = false;
      });

    } catch (error) {
      logger.error('Failed to connect to RabbitMQ for notifications', { error: error.message });
      this.connected = false;
      throw error;
    }
  }

  // Queue notification for processing
  async queueNotification(notification) {
    try {
      await this.connect();

      const message = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: notification.type,
        recipient: notification.recipient,
        data: notification.data || {},
        channel: notification.channel || 'email',
        priority: notification.priority || 'normal',
        requestedBy: notification.requestedBy,
        queuedAt: new Date().toISOString(),
        retryCount: 0
      };

      await this.channel.sendToQueue(
        this.notificationQueue,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          messageId: message.id,
          timestamp: Date.now(),
          headers: {
            'x-notification-type': notification.type,
            'x-channel': notification.channel
          }
        }
      );

      logger.info('Notification queued', {
        id: message.id,
        type: notification.type,
        recipient: notification.recipient,
        channel: notification.channel
      });

      return { queued: true, id: message.id };

    } catch (error) {
      logger.error('Failed to queue notification', {
        error: error.message,
        type: notification.type,
        recipient: notification.recipient
      });
      throw error;
    }
  }

  // Start consuming notifications
  async startConsuming() {
    try {
      await this.connect();

      // Set prefetch to process one message at a time
      await this.channel.prefetch(1);

      logger.info('Starting notification consumption');

      await this.channel.consume(this.notificationQueue, async (msg) => {
        if (msg) {
          try {
            const notification = JSON.parse(msg.content.toString());

            logger.info('Processing notification', {
              id: notification.id,
              type: notification.type,
              recipient: notification.recipient
            });

            // Process the notification
            await this.processNotification(notification);

            // Acknowledge message
            this.channel.ack(msg);

            logger.info('Notification processed successfully', {
              id: notification.id
            });

          } catch (error) {
            logger.error('Failed to process notification', {
              error: error.message,
              messageId: msg.properties.messageId,
              retryCount: msg.properties.headers?.['x-retry-count'] || 0
            });

            const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;

            if (retryCount < 3) {
              // Requeue with retry count
              setTimeout(() => {
                this.channel.nack(msg, false, false);
                // Send to retry queue or handle retry logic
              }, 5000 * retryCount);
            } else {
              // Give up after 3 retries
              this.channel.nack(msg, false, false);
              logger.error('Notification failed permanently after 3 retries', {
                messageId: msg.properties.messageId
              });
            }
          }
        }
      }, { noAck: false });

    } catch (error) {
      logger.error('Failed to start notification consumption', { error: error.message });
      throw error;
    }
  }

  // Process notification based on type and channel
  async processNotification(notification) {
    const { type, recipient, data, channel } = notification;

    switch (channel) {
      case 'email':
        await this.sendEmailNotification(type, recipient, data);
        break;

      case 'push':
        await this.sendPushNotification(type, recipient, data);
        break;

      case 'sms':
        await this.sendSMSNotification(type, recipient, data);
        break;

      default:
        logger.warn('Unknown notification channel', { channel, type });
    }
  }

  // Send email notification
  async sendEmailNotification(type, recipient, data) {
    try {
      let templateName;
      let templateData;

      // Map notification types to email templates
      switch (type) {
        case 'user.welcome':
          templateName = 'welcome';
          templateData = {
            userName: data.userName || recipient,
            userEmail: recipient
          };
          break;

        case 'order.confirmation':
          templateName = 'order-confirmation';
          templateData = {
            userName: data.userName,
            orderId: data.orderId,
            orderDate: data.orderDate,
            orderStatus: data.orderStatus,
            shippingAddress: data.shippingAddress,
            orderItems: data.orderItems,
            totalAmount: data.totalAmount,
            currencySymbol: data.currencySymbol || '$'
          };
          break;

        case 'order.shipped':
          templateName = 'shipping-update';
          templateData = {
            userName: data.userName,
            orderId: data.orderId,
            carrier: data.carrier,
            trackingNumber: data.trackingNumber,
            estimatedDelivery: data.estimatedDelivery,
            trackingUrl: data.trackingUrl
          };
          break;

        case 'password.reset':
          templateName = 'password-reset';
          templateData = {
            userName: data.userName,
            resetUrl: data.resetUrl
          };
          break;

        case 'test':
          templateName = 'test';
          templateData = data;
          break;

        default:
          logger.warn('Unknown email notification type', { type });
          return;
      }

      const template = templateService.getTemplate(templateName, templateData);
      await emailService.sendEmail(recipient, template.subject, template.html, template.text);

      logger.info('Email notification sent', {
        type,
        recipient,
        template: templateName
      });

    } catch (error) {
      logger.error('Failed to send email notification', {
        error: error.message,
        type,
        recipient
      });
      throw error;
    }
  }

  // Send push notification (placeholder)
  async sendPushNotification(type, recipient, data) {
    // TODO: Implement push notification service (e.g., Firebase, OneSignal)
    logger.info('Push notification placeholder', {
      type,
      recipient,
      data: JSON.stringify(data).substring(0, 100)
    });
  }

  // Send SMS notification (placeholder)
  async sendSMSNotification(type, recipient, data) {
    // TODO: Implement SMS service (e.g., Twilio, AWS SNS)
    logger.info('SMS notification placeholder', {
      type,
      recipient,
      data: JSON.stringify(data).substring(0, 100)
    });
  }

  // Get queue statistics
  async getQueueStats() {
    try {
      await this.connect();

      const queueInfo = await this.channel.assertQueue(this.notificationQueue, { passive: true });

      return {
        queue: this.notificationQueue,
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount,
        connected: this.connected
      };

    } catch (error) {
      logger.error('Failed to get queue stats', { error: error.message });
      return {
        queue: this.notificationQueue,
        messageCount: 0,
        consumerCount: 0,
        connected: false,
        error: error.message
      };
    }
  }

  // Clear queue (for testing)
  async clearQueue() {
    try {
      await this.connect();

      const result = await this.channel.purgeQueue(this.notificationQueue);

      logger.info('Notification queue cleared', {
        queue: this.notificationQueue,
        purgedMessages: result.messageCount
      });

      return { cleared: true, purgedMessages: result.messageCount };

    } catch (error) {
      logger.error('Failed to clear notification queue', { error: error.message });
      throw error;
    }
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
      logger.info('Notification queue service disconnected from RabbitMQ');
    } catch (error) {
      logger.error('Error closing notification queue connection', { error: error.message });
    }
  }
}

export default new QueueService();
