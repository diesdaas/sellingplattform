import vendorRoutes from './routes/index.js';

export const vendorModule = {
  name: 'vendors', // Changed to plural to match /api/vendors
  routes: vendorRoutes,
  version: '1.0.0'
};

export default vendorModule;
