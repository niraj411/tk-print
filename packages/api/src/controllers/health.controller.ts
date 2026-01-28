import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { testPrinterConnection } from '../services/printer.service.js';

export const healthRouter: RouterType = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  const checks = {
    database: false,
    redis: false,
    printer: false,
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  // Check Redis
  try {
    await redis.ping();
    checks.redis = true;
  } catch {
    checks.redis = false;
  }

  // Check printer
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });
    if (settings) {
      checks.printer = await testPrinterConnection(settings);
    }
  } catch {
    checks.printer = false;
  }

  const healthy = checks.database && checks.redis;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
  });
});

healthRouter.get('/woocommerce', async (_req: Request, res: Response) => {
  const url = process.env.WOOCOMMERCE_URL;
  const key = process.env.WOOCOMMERCE_KEY;
  const secret = process.env.WOOCOMMERCE_SECRET;

  if (!url || !key || !secret) {
    res.status(500).json({
      connected: false,
      error: 'WooCommerce credentials not configured',
    });
    return;
  }

  try {
    // Test connection by fetching recent orders
    const endpoint = `${url}/wp-json/wc/v3/orders?per_page=5`;
    const response = await fetch(endpoint, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64'),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({
        connected: false,
        error: `WooCommerce API error: ${response.status}`,
        details: errorText,
      });
      return;
    }

    const orders = await response.json() as Array<{ id: number; number: string; status: string; date_created: string }>;
    res.json({
      connected: true,
      recentOrders: orders.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        date: o.date_created,
      })),
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

healthRouter.get('/printer', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      res.status(500).json({ connected: false, error: 'Settings not found' });
      return;
    }

    const connected = await testPrinterConnection(settings);
    res.json({ connected });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
