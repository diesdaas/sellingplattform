// Placeholder controller for portfolioController.js
import { sendSuccess } from '@gocart/shared';

export const placeholderHandler = async (req, res) => {
  sendSuccess(res, { module: 'portfolioController.js', placeholder: true }, 'Placeholder response');
};
