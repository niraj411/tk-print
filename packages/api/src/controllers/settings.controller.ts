import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { prisma } from '../lib/prisma.js';
import { testPrinterConnection, printTestReceipt } from '../services/printer.service.js';

export const settingsRouter: RouterType = Router();

settingsRouter.get('/', async (_req: Request, res: Response) => {
  const settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  });

  res.json(settings);
});

settingsRouter.put('/', async (req: Request, res: Response) => {
  const {
    printerIp,
    printerPort,
    storeName,
    storeAddress,
    storePhone,
    storeFooter,
    receiptWidth,
  } = req.body;

  const settings = await prisma.settings.update({
    where: { id: 'default' },
    data: {
      printerIp,
      printerPort,
      storeName,
      storeAddress,
      storePhone,
      storeFooter,
      receiptWidth,
    },
  });

  res.json(settings);
});

settingsRouter.post('/test-print', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      res.status(500).json({ success: false, error: 'Settings not found' });
      return;
    }

    await printTestReceipt(settings);
    res.json({ success: true });
  } catch (error) {
    console.error('Test print failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

settingsRouter.get('/test-connection', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      res.status(500).json({ connected: false, error: 'Settings not found' });
      return;
    }

    const isConnected = await testPrinterConnection(settings);
    res.json({ connected: isConnected });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
