const axios = require('axios');
const { config } = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * Prodigi Print-on-Demand Service
 * Documentation: https://www.prodigi.com/print-api/docs/reference/
 */
class ProdigiService {
  constructor() {
    this.apiKey = config.prodigi.apiKey;
    this.baseUrl = config.prodigi.baseUrl;
    this.environment = config.prodigi.environment;

    if (!this.apiKey) {
      console.warn('⚠️  Prodigi API Key not configured. PoD features will be disabled.');
    }
  }

  /**
   * Make authenticated request to Prodigi API
   */
  async request(method, endpoint, data = null) {
    if (!this.apiKey) {
      throw new AppError('Prodigi API key not configured', 500);
    }

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        data,
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        // Prodigi API error
        throw new AppError(
          error.response.data?.statusText || 'Prodigi API error',
          error.response.status || 500,
          error.response.data?.data
        );
      }
      throw new AppError('Failed to connect to Prodigi API', 500);
    }
  }

  /**
   * Create a quote for pricing calculation
   * @param {Object} quoteData - Quote data
   * @returns {Promise<Object>} Quote response
   */
  async createQuote(quoteData) {
    return await this.request('POST', '/Quotes', quoteData);
  }

  /**
   * Get product details
   * @param {string} sku - Product SKU
   * @returns {Promise<Object>} Product details
   */
  async getProductDetails(sku) {
    return await this.request('GET', `/ProductDetails/${sku}`);
  }

  /**
   * Create an order
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Order response
   */
  async createOrder(orderData) {
    return await this.request('POST', '/Orders', orderData);
  }

  /**
   * Get order by ID
   * @param {string} orderId - Prodigi order ID
   * @returns {Promise<Object>} Order details
   */
  async getOrder(orderId) {
    return await this.request('GET', `/Orders/${orderId}`);
  }

  /**
   * Get all orders
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Orders list
   */
  async getOrders(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/Orders?${queryParams}` : '/Orders';
    return await this.request('GET', endpoint);
  }

  /**
   * Cancel an order
   * @param {string} orderId - Prodigi order ID
   * @returns {Promise<Object>} Cancellation response
   */
  async cancelOrder(orderId) {
    return await this.request('POST', `/Orders/${orderId}/Actions/Cancel`);
  }

  /**
   * Get available products/SKUs for a category
   * Common SKUs for art prints:
   * - GLOBAL-CFPM-16X20 (16x20 Canvas Print)
   * - GLOBAL-CFPM-12X12 (12x12 Canvas Print)
   * - GLOBAL-CFPM-8X10 (8x10 Canvas Print)
   * - GLOBAL-PAP-16X20 (16x20 Poster)
   * - GLOBAL-PAP-12X12 (12x12 Poster)
   * - GLOBAL-PAP-A3 (A3 Poster)
   * - GLOBAL-PAP-A4 (A4 Poster)
   */
  getAvailableSKUs() {
    return {
      canvas: [
        { sku: 'GLOBAL-CFPM-16X20', name: '16x20 Canvas Print', size: '16x20' },
        { sku: 'GLOBAL-CFPM-12X12', name: '12x12 Canvas Print', size: '12x12' },
        { sku: 'GLOBAL-CFPM-8X10', name: '8x10 Canvas Print', size: '8x10' },
      ],
      poster: [
        { sku: 'GLOBAL-PAP-16X20', name: '16x20 Poster', size: '16x20' },
        { sku: 'GLOBAL-PAP-12X12', name: '12x12 Poster', size: '12x12' },
        { sku: 'GLOBAL-PAP-A3', name: 'A3 Poster', size: 'A3' },
        { sku: 'GLOBAL-PAP-A4', name: 'A4 Poster', size: 'A4' },
      ],
      fineArt: [
        { sku: 'GLOBAL-FAP-16X20', name: '16x20 Fine Art Print', size: '16x20' },
        { sku: 'GLOBAL-FAP-12X12', name: '12x12 Fine Art Print', size: '12x12' },
      ],
    };
  }

  /**
   * Calculate price for a product variant
   * @param {string} sku - Product SKU
   * @param {string} imageUrl - Image URL
   * @param {string} shippingMethod - Shipping method (Budget, Standard, Express, Overnight)
   * @param {Object} recipient - Recipient address
   * @returns {Promise<Object>} Quote with pricing
   */
  async calculatePrice(sku, imageUrl, shippingMethod = 'Standard', recipient = null) {
    // Default recipient for quote (can be null for price calculation)
    const defaultRecipient = recipient || {
      name: 'Test Recipient',
      address: {
        line1: '123 Test St',
        townOrCity: 'Test City',
        postalOrZipCode: '12345',
        countryCode: 'US',
      },
    };

    const quoteData = {
      items: [
        {
          sku,
          copies: 1,
          assets: [
            {
              printArea: 'default',
              url: imageUrl,
            },
          ],
        },
      ],
      recipient: defaultRecipient,
      shippingMethod,
    };

    return await this.createQuote(quoteData);
  }

  /**
   * Create order from artwork
   * @param {Object} orderData - Order data
   * @param {string} orderData.sku - Product SKU
   * @param {string} orderData.imageUrl - Artwork image URL
   * @param {number} orderData.copies - Number of copies
   * @param {Object} orderData.recipient - Shipping recipient
   * @param {string} orderData.shippingMethod - Shipping method
   * @param {string} orderData.merchantReference - Our order reference
   * @returns {Promise<Object>} Created order
   */
  async createOrderFromArtwork(orderData) {
    const { sku, imageUrl, copies = 1, recipient, shippingMethod = 'Standard', merchantReference } = orderData;

    if (!sku || !imageUrl || !recipient) {
      throw new AppError('SKU, imageUrl, and recipient are required', 400);
    }

    const prodigiOrder = {
      items: [
        {
          sku,
          copies,
          assets: [
            {
              printArea: 'default',
              url: imageUrl,
            },
          ],
        },
      ],
      recipient: {
        name: recipient.name,
        email: recipient.email || null,
        phoneNumber: recipient.phoneNumber || null,
        address: {
          line1: recipient.address.line1,
          line2: recipient.address.line2 || null,
          townOrCity: recipient.address.city,
          stateOrCounty: recipient.address.state || null,
          postalOrZipCode: recipient.address.zip,
          countryCode: recipient.address.countryCode || 'US',
        },
      },
      shippingMethod,
      merchantReference: merchantReference || null,
    };

    return await this.createOrder(prodigiOrder);
  }
}

// Export singleton instance
module.exports = new ProdigiService();


