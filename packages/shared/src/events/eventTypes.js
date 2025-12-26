// Standardized event types for event-driven communication
export const EventTypes = {
  // Auth Events
  USER_CREATED: 'user.created',
  USER_VERIFIED: 'user.verified',
  USER_PASSWORD_RESET: 'user.password_reset',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // Payment Events
  PAYMENT_INTENT_CREATED: 'payment.intent_created',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYOUT_REQUESTED: 'payout.requested',
  PAYOUT_COMPLETED: 'payout.completed',
  PAYOUT_FAILED: 'payout.failed',
  ARTIST_CONNECTED: 'artist.connected', // Stripe Connect onboarded
  ARTIST_DISCONNECTED: 'artist.disconnected',

  // Order Events
  ORDER_PLACED: 'order.placed',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_PROCESSING: 'order.processing',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_REFUNDED: 'order.refunded',

  // Product Events
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  PRODUCT_OUT_OF_STOCK: 'product.out_of_stock',
  PRODUCT_RESTOCKED: 'product.restocked',

  // Artwork Events
  ARTWORK_UPLOADED: 'artwork.uploaded',
  ARTWORK_UPDATED: 'artwork.updated',
  ARTWORK_DELETED: 'artwork.deleted',
  ARTWORK_PUBLISHED: 'artwork.published',

  // Portfolio Events
  PORTFOLIO_CREATED: 'portfolio.created',
  PORTFOLIO_UPDATED: 'portfolio.updated',
  PORTFOLIO_PUBLISHED: 'portfolio.published',

  // Media Events
  IMAGE_UPLOADED: 'image.uploaded',
  IMAGE_PROCESSED: 'image.processed',
  IMAGE_DELETED: 'image.deleted',

  // Notification Events
  EMAIL_SENT: 'email.sent',
  EMAIL_FAILED: 'email.failed',
  PUSH_NOTIFICATION_SENT: 'push.sent',
  PUSH_NOTIFICATION_FAILED: 'push.failed',

  // Cart Events
  CART_ITEM_ADDED: 'cart.item_added',
  CART_ITEM_REMOVED: 'cart.item_removed',
  CART_CLEARED: 'cart.cleared',

  // Review Events
  REVIEW_CREATED: 'review.created',
  REVIEW_UPDATED: 'review.updated',
  REVIEW_DELETED: 'review.deleted',

  // Admin Events
  STORE_APPROVED: 'store.approved',
  STORE_REJECTED: 'store.rejected',
  COUPON_CREATED: 'coupon.created',
  COUPON_UPDATED: 'coupon.updated',
  COUPON_DELETED: 'coupon.deleted'
};

// Event priority levels
export const EventPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Queue names for different event types
export const Queues = {
  NOTIFICATIONS: 'gocart.notifications',
  ANALYTICS: 'gocart.analytics',
  ORDER_PROCESSING: 'gocart.order_processing',
  PAYMENT_PROCESSING: 'gocart.payment_processing',
  EMAIL_DELIVERY: 'gocart.email_delivery',
  IMAGE_PROCESSING: 'gocart.image_processing'
};

// Exchange name
export const EXCHANGE_NAME = 'gocart.events';
