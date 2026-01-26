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
