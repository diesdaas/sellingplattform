// Products routes
import express from 'express';
import { asyncHandler, schemas, validate, validateQuery } from '@gocart/shared';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';

const router = express.Router();

// GET /api/catalog/products - List products
router.get('/', validateQuery(schemas.catalog.productSearch), asyncHandler(listProducts));

// GET /api/catalog/products/:id - Get product by ID
router.get('/:id', asyncHandler(getProduct));

// POST /api/catalog/products - Create product (protected)
router.post('/', validate(schemas.product.create), asyncHandler(createProduct));

// PUT /api/catalog/products/:id - Update product (protected)
router.put('/:id', validate(schemas.product.update), asyncHandler(updateProduct));

// DELETE /api/catalog/products/:id - Delete product (protected)
router.delete('/:id', asyncHandler(deleteProduct));

export default router;

