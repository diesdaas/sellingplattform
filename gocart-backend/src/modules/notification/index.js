// Notification Module - Handles Email, Templates, Queue Consumer
import notificationRoutes from './routes/index.js';

// Module interface
export const notificationModule = {
  name: 'notification',
  routes: notificationRoutes,
  version: '1.0.0',
  placeholder: true // Indicates this is a placeholder implementation
};

export default notificationModule;
