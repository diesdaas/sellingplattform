import Joi from 'joi';
import { ValidationError } from '../errors/AppError.js';

// Common validation schemas
export const schemas = {
  // User validation
  user: {
    register: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
        .messages({
          'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
        }),
      name: Joi.string().min(2).max(50).required(),
      role: Joi.string().valid('customer', 'artist', 'admin').default('customer')
    }),

    login: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    }),

    updateProfile: Joi.object({
      name: Joi.string().min(2).max(50),
      email: Joi.string().email()
    }).min(1)
  },

  // Product validation
  product: {
    create: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      description: Joi.string().max(1000),
      price: Joi.number().min(0).required(),
      mrp: Joi.number().min(0),
      category: Joi.string().required(),
      images: Joi.array().items(Joi.string().uri()).min(1).required(),
      inStock: Joi.boolean().default(true)
    }),

    update: Joi.object({
      name: Joi.string().min(2).max(100),
      description: Joi.string().max(1000),
      price: Joi.number().min(0),
      mrp: Joi.number().min(0),
      category: Joi.string(),
      images: Joi.array().items(Joi.string().uri()),
      inStock: Joi.boolean()
    }).min(1)
  },

  // Order validation
  order: {
    create: Joi.object({
      addressId: Joi.string().uuid().required(),
      paymentMethod: Joi.string().valid('COD', 'STRIPE').required(),
      items: Joi.array().items(
        Joi.object({
          productId: Joi.string().uuid().required(),
          quantity: Joi.number().integer().min(1).required(),
          variant: Joi.object().default({})
        })
      ).min(1).required()
    }),

    updateStatus: Joi.object({
      status: Joi.string().valid(
        'ORDER_PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'
      ).required()
    })
  },

  // Payment validation
  payment: {
    createIntent: Joi.object({
      amount: Joi.number().min(0.01).required(),
      currency: Joi.string().default('usd'),
      orderId: Joi.string().uuid().required()
    }),

    confirmPayment: Joi.object({
      paymentIntentId: Joi.string().required(),
      orderId: Joi.string().uuid().required()
    })
  },

  // Artwork validation
  artwork: {
    create: Joi.object({
      title: Joi.string().min(1).max(100).required(),
      description: Joi.string().max(500),
      imageUrl: Joi.string().uri().required(),
      medium: Joi.string().max(50),
      style: Joi.string().max(50),
      year: Joi.number().integer().min(1900).max(new Date().getFullYear()),
      tags: Joi.array().items(Joi.string().max(30)).max(10),
      isPublic: Joi.boolean().default(true)
    }),

    update: Joi.object({
      title: Joi.string().min(1).max(100),
      description: Joi.string().max(500),
      medium: Joi.string().max(50),
      style: Joi.string().max(50),
      year: Joi.number().integer().min(1900).max(new Date().getFullYear()),
      tags: Joi.array().items(Joi.string().max(30)).max(10),
      isPublic: Joi.boolean()
    }).min(1)
  },

  // Catalog/Product search validation
  catalog: {
    productSearch: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20),
      category: Joi.string().max(50),
      minPrice: Joi.number().min(0),
      maxPrice: Joi.number().min(0),
      search: Joi.string().min(1).max(100),
      artistId: Joi.string().uuid(),
      inStock: Joi.boolean(),
      sortBy: Joi.string().valid('createdAt', 'price', 'name').default('createdAt'),
      order: Joi.string().valid('asc', 'desc').default('desc')
    }),

    artworkSearch: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20),
      artistId: Joi.string().uuid(),
      isPublic: Joi.boolean(),
      search: Joi.string().min(1).max(100),
      medium: Joi.string().max(50),
      style: Joi.string().max(50),
      sortBy: Joi.string().valid('createdAt', 'title', 'year').default('createdAt'),
      order: Joi.string().valid('asc', 'desc').default('desc')
    })
  }
};

// Validation middleware
export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      throw new ValidationError(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    next();
  };
};

// Query parameter validation
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      throw new ValidationError(`Query validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    next();
  };
};

// Common query schemas
export const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  search: Joi.object({
    q: Joi.string().min(1).max(100),
    category: Joi.string(),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    inStock: Joi.boolean()
  })
};
