// Placeholder controller for reviewController.js
import { sendSuccess } from '@gocart/shared';

export const placeholderHandler = async (req, res) => {
  sendSuccess(res, { module: 'reviewController.js', placeholder: true }, 'Placeholder response');
};
