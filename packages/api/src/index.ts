import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma.js';
import { setupQueue, closeQueue } from './queues/print-queue.js';
import { webhookRouter } from './controllers/webhook.controller.js';
import { ordersRouter } from './controllers/orders.controller.js';
import { printJobsRouter } from './controllers/print-jobs.controller.js';
import { settingsRouter } from './controllers/settings.controller.js';
import { healthRouter } from './controllers/health.controller.js';
import { startPollingFallback, stopPollingFallback } from './services/polling.service.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Raw body for webhook signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

// JSON parsing for other routes
app.use(express.json());
app.use(cors());

// API Routes
app.use('/api/webhooks', webhookRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/print-jobs', printJobsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/health', healthRouter);

// Serve static dashboard in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('public'));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile('index.html', { root: 'public' });
    }
  });
}

async function main() {
  // Initialize settings if not exist
  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      printerIp: process.env.PRINTER_IP || '192.168.1.100',
      printerPort: parseInt(process.env.PRINTER_PORT || '9100'),
      storeName: process.env.STORE_NAME || 'My Store',
      storeAddress: process.env.STORE_ADDRESS || '',
      storePhone: process.env.STORE_PHONE || '',
      storeFooter: process.env.STORE_FOOTER || 'Thank you for your order!',
    },
  });

  // Setup print queue
  await setupQueue();

  // Start polling fallback
  startPollingFallback();

  app.listen(PORT, () => {
    console.log(`TK-Print API running on port ${PORT}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  stopPollingFallback();
  await closeQueue();
  await prisma.$disconnect();
  process.exit(0);
});

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
