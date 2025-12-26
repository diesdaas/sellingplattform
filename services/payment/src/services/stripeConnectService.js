import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { logger } from '@gocart/shared';

const prisma = new PrismaClient();

class StripeConnectService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    });
  }

  // Create Express account for artist
  async createExpressAccount(artistId, email, country = 'US') {
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          artistId
        }
      });

      // Save account in database
      await prisma.stripeConnectAccount.create({
        data: {
          artistId,
          stripeAccountId: account.id,
          status: 'PENDING',
          capabilities: account.capabilities,
          requirements: account.requirements
        }
      });

      logger.info('Stripe Connect account created', {
        artistId,
        stripeAccountId: account.id,
        email
      });

      return {
        accountId: account.id,
        onboardingUrl: await this.createAccountLink(account.id)
      };

    } catch (error) {
      logger.error('Failed to create Stripe Connect account', {
        error: error.message,
        artistId,
        email
      });
      throw error;
    }
  }

  // Create account onboarding link
  async createAccountLink(accountId, refreshUrl = null, returnUrl = null) {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl || `${process.env.FRONTEND_URL}/artist/payouts`,
        return_url: returnUrl || `${process.env.FRONTEND_URL}/artist/payouts`,
        type: 'account_onboarding',
      });

      return accountLink.url;

    } catch (error) {
      logger.error('Failed to create account link', {
        error: error.message,
        accountId
      });
      throw error;
    }
  }

  // Get account details
  async getAccount(accountId) {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);

      return {
        id: account.id,
        email: account.email,
        country: account.country,
        capabilities: account.capabilities,
        requirements: account.requirements,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted
      };

    } catch (error) {
      logger.error('Failed to get account', {
        error: error.message,
        accountId
      });
      throw error;
    }
  }

  // Update account status in database
  async updateAccountStatus(accountId) {
    try {
      const account = await this.getAccount(accountId);

      await prisma.stripeConnectAccount.update({
        where: { stripeAccountId: accountId },
        data: {
          status: account.charges_enabled && account.payouts_enabled ? 'ACTIVE' : 'RESTRICTED',
          capabilities: account.capabilities,
          requirements: account.requirements,
          updatedAt: new Date()
        }
      });

      return account;

    } catch (error) {
      logger.error('Failed to update account status', {
        error: error.message,
        accountId
      });
      throw error;
    }
  }

  // Create payout to artist
  async createPayout(artistId, amount, currency = 'usd') {
    try {
      // Get artist's Stripe account
      const connectAccount = await prisma.stripeConnectAccount.findUnique({
        where: { artistId }
      });

      if (!connectAccount) {
        throw new Error('Artist has no Stripe Connect account');
      }

      if (connectAccount.status !== 'ACTIVE') {
        throw new Error('Artist Stripe account is not active');
      }

      // Create transfer to connected account
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        destination: connectAccount.stripeAccountId,
        metadata: {
          artistId
        }
      });

      // Record payout in database
      const payout = await prisma.payout.create({
        data: {
          artistId,
          stripeAccountId: connectAccount.stripeAccountId,
          amount: Math.round(amount * 100),
          currency,
          status: 'IN_TRANSIT',
          stripePayoutId: transfer.id,
          metadata: { transferId: transfer.id }
        }
      });

      logger.info('Payout created', {
        payoutId: payout.id,
        artistId,
        amount,
        currency,
        stripeAccountId: connectAccount.stripeAccountId
      });

      return {
        payoutId: payout.id,
        transferId: transfer.id,
        amount,
        currency,
        status: 'IN_TRANSIT'
      };

    } catch (error) {
      logger.error('Failed to create payout', {
        error: error.message,
        artistId,
        amount
      });
      throw error;
    }
  }

  // Get payout details
  async getPayout(payoutId) {
    try {
      const payout = await prisma.payout.findUnique({
        where: { id: payoutId }
      });

      if (!payout) {
        throw new Error('Payout not found');
      }

      // Get transfer details from Stripe
      const transfer = await this.stripe.transfers.retrieve(payout.stripePayoutId);

      return {
        id: payout.id,
        artistId: payout.artistId,
        amount: payout.amount / 100,
        currency: payout.currency,
        status: payout.status,
        requestedAt: payout.requestedAt,
        processedAt: payout.processedAt,
        completedAt: payout.completedAt,
        transferDetails: {
          id: transfer.id,
          amount: transfer.amount / 100,
          destination: transfer.destination,
          created: transfer.created
        }
      };

    } catch (error) {
      logger.error('Failed to get payout', {
        error: error.message,
        payoutId
      });
      throw error;
    }
  }

  // List payouts for artist
  async listArtistPayouts(artistId, limit = 20, offset = 0) {
    try {
      const payouts = await prisma.payout.findMany({
        where: { artistId },
        orderBy: { requestedAt: 'desc' },
        take: limit,
        skip: offset
      });

      return payouts.map(payout => ({
        id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        status: payout.status,
        requestedAt: payout.requestedAt,
        processedAt: payout.processedAt,
        completedAt: payout.completedAt
      }));

    } catch (error) {
      logger.error('Failed to list artist payouts', {
        error: error.message,
        artistId
      });
      throw error;
    }
  }

  // Get artist balance
  async getArtistBalance(artistId) {
    try {
      const connectAccount = await prisma.stripeConnectAccount.findUnique({
        where: { artistId }
      });

      if (!connectAccount) {
        return { available: 0, pending: 0, currency: 'usd' };
      }

      const balance = await this.stripe.balance.retrieve({
        stripeAccount: connectAccount.stripeAccountId
      });

      // Calculate total available and pending
      const available = balance.available.reduce((sum, bal) => sum + bal.amount, 0) / 100;
      const pending = balance.pending.reduce((sum, bal) => sum + bal.amount, 0) / 100;

      return {
        available,
        pending,
        currency: balance.available[0]?.currency || 'usd',
        accountActive: connectAccount.status === 'ACTIVE'
      };

    } catch (error) {
      logger.error('Failed to get artist balance', {
        error: error.message,
        artistId
      });
      throw error;
    }
  }

  // Handle Stripe Connect webhook events
  async handleConnectWebhook(event) {
    try {
      const { type, data } = event;

      switch (type) {
        case 'account.updated':
          await this.handleAccountUpdated(data.object);
          break;

        case 'transfer.created':
          await this.handleTransferCreated(data.object);
          break;

        case 'transfer.failed':
          await this.handleTransferFailed(data.object);
          break;

        case 'payout.paid':
          await this.handlePayoutPaid(data.object);
          break;

        default:
          logger.info('Unhandled Connect webhook event', { type });
      }

    } catch (error) {
      logger.error('Failed to handle Connect webhook', {
        error: error.message,
        eventType: event.type
      });
      throw error;
    }
  }

  // Handle account updates
  async handleAccountUpdated(account) {
    try {
      await prisma.stripeConnectAccount.update({
        where: { stripeAccountId: account.id },
        data: {
          status: account.charges_enabled && account.payouts_enabled ? 'ACTIVE' : 'RESTRICTED',
          capabilities: account.capabilities,
          requirements: account.requirements,
          updatedAt: new Date()
        }
      });

      logger.info('Connect account updated', {
        stripeAccountId: account.id,
        status: account.charges_enabled && account.payouts_enabled ? 'ACTIVE' : 'RESTRICTED'
      });

    } catch (error) {
      logger.error('Failed to handle account update', {
        error: error.message,
        stripeAccountId: account.id
      });
    }
  }

  // Handle transfer events
  async handleTransferCreated(transfer) {
    // Update payout status
    await prisma.payout.updateMany({
      where: { stripePayoutId: transfer.id },
      data: {
        status: 'IN_TRANSIT',
        processedAt: new Date()
      }
    });
  }

  async handleTransferFailed(transfer) {
    await prisma.payout.updateMany({
      where: { stripePayoutId: transfer.id },
      data: { status: 'FAILED' }
    });
  }

  async handlePayoutPaid(payout) {
    // Find and update related payouts
    await prisma.payout.updateMany({
      where: {
        stripeAccountId: payout.destination,
        status: 'IN_TRANSIT'
      },
      data: {
        status: 'SUCCEEDED',
        completedAt: new Date()
      }
    });
  }
}

export default new StripeConnectService();
