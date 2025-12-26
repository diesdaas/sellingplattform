// Order Module - Placeholder for now
import express from 'express';
import { sendSuccess } from '@gocart/shared';

const router = express.Router();

// Placeholder routes
router.get('/', (req, res) => sendSuccess(res, { message: 'Order module placeholder' }));

export const orderModule = {
  name: 'order',
  routes: router,
  version: '1.0.0',
  placeholder: true
};

export default orderModule;
