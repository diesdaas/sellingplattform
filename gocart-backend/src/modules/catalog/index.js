// Catalog Module - Products, Artworks, Portfolios
import express from 'express';
import productRoutes from './routes/products.js';
import artworkRoutes from './routes/artworks.js';

const router = express.Router();

// Mount sub-routes
router.use('/products', productRoutes);
router.use('/artworks', artworkRoutes);

// Module info endpoint
router.get('/', (req, res) => {
  res.json({
    module: 'catalog',
    message: 'Catalog API - Products and Artworks',
    routes: {
      products: '/api/catalog/products',
      artworks: '/api/catalog/artworks'
    }
  });
});

export const catalogModule = {
  name: 'catalog',
  routes: router,
  version: '1.0.0'
};

export default catalogModule;
