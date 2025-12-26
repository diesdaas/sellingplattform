import { sendSuccess, sendError } from '@gocart/shared';
import stripeConnectService from '../services/stripeConnectService.js';
import { eventPublisher } from '@gocart/shared';
import { EventTypes } from '@gocart/shared';
import { logger } from '@gocart/shared';

// Get artist balance
export const getArtistBalance = async (req, res) => {
  try {
    const artistId = req.user.id;

    const balance = await stripeConnectService.getArtistBalance(artistId);

    sendSuccess(res, { balance });

  } catch (error) {
    logger.error('Get artist balance failed', {
      error: error.message,
      artistId: req.user?.id
    });
    sendError(res, error);
  }
};

// Create Stripe Connect account
export const createConnectAccount = async (req, res) => {
  try {
    const artistId = req.user.id;
    const { email, country = 'US' } = req.body;

    if (!email) {
      return sendError(res, { message: 'Email is required' }, 400);
    }

    const account = await stripeConnectService.createExpressAccount(artistId, email, country);

    sendSuccess(res, {
      account: {
        id: account.accountId,
        onboardingUrl: account.onboardingUrl
      }
    });

  } catch (error) {
    logger.error('Create Connect account failed', {
      error: error.message,
      artistId: req.user?.id
    });
    sendError(res, error);
  }
};

// Get Connect account status
export const getConnectAccount = async (req, res) => {
  try {
    const artistId = req.user.id;

    const account = await stripeConnectService.getAccount(artistId);

    sendSuccess(res, { account });

  } catch (error) {
    logger.error('Get Connect account failed', {
      error: error.message,
      artistId: req.user?.id
    });
    sendError(res, error);
  }
};

// Create account onboarding link
export const createAccountLink = async (req, res) => {
  try {
    const { accountId } = req.params;
    const artistId = req.user.id;

    // TODO: Verify that account belongs to artist

    const onboardingUrl = await stripeConnectService.createAccountLink(accountId);

    sendSuccess(res, { onboardingUrl });

  } catch (error) {
    logger.error('Create account link failed', {
      error: error.message,
      accountId: req.params.accountId,
      artistId: req.user?.id
    });
    sendError(res, error);
  }
};

// Request payout
export const requestPayout = async (req, res) => {
  try {
    const artistId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return sendError(res, { message: 'Valid amount is required' }, 400);
    }

    // Check balance first
    const balance = await stripeConnectService.getArtistBalance(artistId);

    if (amount > balance.available) {
      return sendError(res, {
        message: 'Insufficient balance',
        available: balance.available
      }, 400);
    }

    const payout = await stripeConnectService.createPayout(artistId, amount);

    // Publish payout event
    await eventPublisher.publish(EventTypes.PAYOUT_REQUESTED, {
      payoutId: payout.payoutId,
      artistId,
      amount,
      currency: 'usd'
    });

    sendSuccess(res, {
      payout: {
        id: payout.payoutId,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status
      }
    });

  } catch (error) {
    logger.error('Request payout failed', {
      error: error.message,
      artistId: req.user?.id,
      amount: req.body.amount
    });
    sendError(res, error);
  }
};

// Get payout history
export const getPayoutHistory = async (req, res) => {
  try {
    const artistId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const payouts = await stripeConnectService.listArtistPayouts(
      artistId,
      parseInt(limit),
      offset
    );

    sendSuccess(res, { payouts });

  } catch (error) {
    logger.error('Get payout history failed', {
      error: error.message,
      artistId: req.user?.id
    });
    sendError(res, error);
  }
};

// Get payout details
export const getPayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const artistId = req.user.id;

    const payout = await stripeConnectService.getPayout(payoutId);

    // Verify payout belongs to artist
    if (payout.artistId !== artistId) {
      return sendError(res, { message: 'Access denied' }, 403);
    }

    sendSuccess(res, { payout });

  } catch (error) {
    logger.error('Get payout failed', {
      error: error.message,
      payoutId: req.params.payoutId,
      artistId: req.user?.id
    });
    sendError(res, error);
  }
};

// Get Stripe Express dashboard link
export const getDashboardLink = async (req, res) => {
  try {
    const artistId = req.user.id;

    // Get artist's Stripe account
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const connectAccount = await prisma.stripeConnectAccount.findUnique({
      where: { artistId }
    });

    if (!connectAccount) {
      return sendError(res, { message: 'No Stripe Connect account found' }, 404);
    }

    // Create login link for Express dashboard
    const loginLink = await stripeConnectService.stripe.accounts.createLoginLink(
      connectAccount.stripeAccountId
    );

    sendSuccess(res, {
      dashboardUrl: loginLink.url
    });

  } catch (error) {
    logger.error('Get dashboard link failed', {
      error: error.message,
      artistId: req.user?.id
    });
    sendError(res, error);
  }
};
