// Simple notification test
import express from 'express';
import cors from 'cors';
import { sendNotification } from './src/modules/notification/controllers/notificationController.js';
import { asyncHandler } from '@gocart/shared';

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// Test notification endpoint
app.post('/api/notifications/send', asyncHandler(sendNotification));

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'notification-test',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Notification test server running on port ${PORT}`);
});
