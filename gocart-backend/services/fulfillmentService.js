const { query } = require('../config/database');
const prodigiService = require('./prodigiService');
const AppError = require('../utils/AppError');

/**
 * Fulfillment Service
 * Handles order fulfillment via Prodigi PoD
 */
class FulfillmentService {
  /**
   * Fulfill order - Create Prodigi orders for all items
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Fulfillment result
   */
  async fulfillOrder(orderId) {
    try {
      // Get order with items
      const orderResult = await query('SELECT * FROM "Order" WHERE id = $1', [orderId]);

      if (orderResult.rows.length === 0) {
        throw new AppError('Order not found', 404);
      }

      const order = orderResult.rows[0];

      if (order.status === 'CANCELLED') {
        throw new AppError('Cannot fulfill cancelled order', 400);
      }

      // Get order items
      const itemsResult = await query(
        `SELECT oi.*, p.images as "productImages", p.variants as "productVariants"
         FROM "OrderItem" oi
         JOIN "Product" p ON oi."productId" = p.id
         WHERE oi."orderId" = $1`,
        [orderId]
      );

      // Get address
      const addressResult = await query('SELECT * FROM "Address" WHERE id = $1', [order.addressId]);
      const address = addressResult.rows[0];

      if (!address) {
        throw new AppError('Shipping address not found', 404);
      }

      const prodigiOrders = [];
      const errors = [];

      for (const orderItem of itemsResult.rows) {
        try {
          const imageUrl = orderItem.productImages && orderItem.productImages[0];

          if (!imageUrl) {
            errors.push({ productId: orderItem.productId, error: 'No image URL available' });
            continue;
          }

          const variant = orderItem.variant || {};
          const sku = variant.sku || (orderItem.productVariants && orderItem.productVariants[0]?.sku) || 'GLOBAL-PAP-A3';

          const recipient = {
            name: address.name,
            email: address.email,
            phoneNumber: address.phone,
            address: {
              line1: address.street,
              line2: '',
              townOrCity: address.city,
              stateOrCounty: address.state,
              postalOrZipCode: address.zip,
              countryCode: this.getCountryCode(address.country),
            },
          };

          const prodigiOrder = await prodigiService.createOrderFromArtwork({
            sku,
            imageUrl,
            copies: orderItem.quantity,
            recipient,
            shippingMethod: 'Standard',
            merchantReference: `${orderId}-${orderItem.productId}`,
          });

          prodigiOrders.push({
            orderItemId: orderItem.productId,
            prodigiOrderId: prodigiOrder.id,
            prodigiOrder,
          });
        } catch (error) {
          errors.push({ productId: orderItem.productId, error: error.message });
        }
      }

      // Update order with Prodigi order IDs
      const podOrderIds = prodigiOrders.map((po) => po.prodigiOrderId);

      await query(
        'UPDATE "Order" SET "podOrderIds" = $1, status = $2, "updatedAt" = NOW() WHERE id = $3',
        [JSON.stringify(podOrderIds), 'PROCESSING', orderId]
      );

      return {
        success: prodigiOrders.length > 0,
        prodigiOrders,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update order tracking from Prodigi webhook
   * @param {string} orderId - Order ID
   * @param {Object} trackingInfo - Tracking information
   */
  async updateTracking(orderId, trackingInfo) {
    await query(
      'UPDATE "Order" SET "trackingInfo" = $1, "updatedAt" = NOW() WHERE id = $2',
      [JSON.stringify(trackingInfo), orderId]
    );
  }

  /**
   * Get country code from country name
   */
  getCountryCode(country) {
    const countryMap = {
      'United States': 'US', 'USA': 'US', 'United Kingdom': 'GB', 'UK': 'GB',
      'Germany': 'DE', 'France': 'FR', 'Canada': 'CA', 'Australia': 'AU',
    };
    return countryMap[country] || 'US';
  }

  /**
   * Handle Prodigi callback/webhook
   */
  async handleProdigiCallback(callbackData) {
    try {
      const { orderId: prodigiOrderId, status, shipments } = callbackData;

      // Find orders with this Prodigi order ID
      const ordersResult = await query('SELECT * FROM "Order" WHERE "podOrderIds" IS NOT NULL');

      const matchingOrders = ordersResult.rows.filter((order) => {
        const podIds = Array.isArray(order.podOrderIds) ? order.podOrderIds : JSON.parse(order.podOrderIds || '[]');
        return podIds.includes(prodigiOrderId);
      });

      for (const order of matchingOrders) {
        const trackingInfo = {
          prodigiOrderId,
          status,
          shipments: shipments || [],
          lastUpdated: new Date().toISOString(),
        };

        await this.updateTracking(order.id, trackingInfo);

        if (status.stage === 'Complete') {
          await query('UPDATE "Order" SET status = $1, "updatedAt" = NOW() WHERE id = $2', ['SHIPPED', order.id]);
        }
      }
    } catch (error) {
      console.error('Error handling Prodigi callback:', error);
      throw error;
    }
  }
}

module.exports = new FulfillmentService();
