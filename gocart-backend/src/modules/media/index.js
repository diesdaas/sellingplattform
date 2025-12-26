// Media Module - Handles Image Upload, Cloudinary/S3 Integration, Optimization
import mediaRoutes from './routes/index.js';

// Module interface
export const mediaModule = {
  name: 'media',
  routes: mediaRoutes,
  version: '1.0.0',
  placeholder: true // Indicates this is a placeholder implementation
};

export default mediaModule;
