import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { processWooCommerceOrder } from '../services/order.service.js';

export const webhookRouter: RouterType = Router();

function verifyWebhookSignature(payload: Buffer, signature: string | undefined): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

webhookRouter.post('/woocommerce', async (req: Request, res: Response) => {
  const signature = req.headers['x-wc-webhook-signature'] as string | undefined;
  const payload = req.body as Buffer;

  // Log the webhook
  const webhookLog = await prisma.webhookLog.create({
    data: {
      payload: payload.toString('utf-8'),
      signature: signature || null,
      verified: false,
    },
  });

  try {
    // Verify signature
    const isValid = verifyWebhookSignature(payload, signature);

    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: { verified: isValid },
    });

    if (!isValid) {
      console.warn('Invalid webhook signature');
      // Still return 200 to prevent retries, but don't process
      res.status(200).json({ received: true, processed: false, reason: 'invalid_signature' });
      return;
    }

    // Parse the payload
    const data = JSON.parse(payload.toString('utf-8'));

    // Check if this is an order ready to be printed (processing or on-hold)
    const printableStatuses = ['processing', 'on-hold'];
    if (printableStatuses.includes(data.status)) {
      await processWooCommerceOrder(data);

      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { processed: true },
      });
    }

    res.status(200).json({ received: true, processed: true });
  } catch (error) {
    console.error('Webhook processing error:', error);

    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    // Return 200 to prevent WooCommerce from retrying
    res.status(200).json({ received: true, processed: false, error: 'processing_error' });
  }
});
