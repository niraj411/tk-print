import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { prisma } from '../lib/prisma.js';
import { queuePrintJob } from '../queues/print-queue.js';
import { processWooCommerceOrder } from '../services/order.service.js';

export const ordersRouter: RouterType = Router();

ordersRouter.get('/', async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page || '1'));
  const limit = parseInt(String(req.query.limit || '20'));
  const search = req.query.search ? String(req.query.search) : undefined;

  const where = search
    ? {
        OR: [
          { orderNumber: { contains: search } },
          { customerName: { contains: search } },
        ],
      }
    : {};

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        printJobs: {
          select: {
            id: true,
            jobType: true,
            status: true,
            attempts: true,
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    orders: orders.map((order) => ({
      ...order,
      lineItems: JSON.parse(order.lineItems),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

ordersRouter.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      printJobs: true,
    },
  });

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  res.json({
    ...order,
    lineItems: JSON.parse(order.lineItems),
  });
});

ordersRouter.post('/:id/reprint', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { jobType } = req.body as { jobType?: 'receipt' | 'kitchen' | 'both' };
  const types = jobType === 'both' ? ['receipt', 'kitchen'] : [jobType || 'receipt'];

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const jobs = [];
  for (const type of types) {
    const printJob = await prisma.printJob.create({
      data: {
        orderId: order.id,
        jobType: type,
        priority: type === 'kitchen' ? 10 : 0,
      },
    });

    await queuePrintJob(printJob.id);
    jobs.push(printJob);
  }

  res.json({ success: true, jobs });
});

// Manual sync endpoint to fetch orders from WooCommerce
ordersRouter.post('/sync', async (_req: Request, res: Response) => {
  const url = process.env.WOOCOMMERCE_URL;
  const key = process.env.WOOCOMMERCE_KEY;
  const secret = process.env.WOOCOMMERCE_SECRET;

  if (!url || !key || !secret) {
    res.status(500).json({ error: 'WooCommerce credentials not configured' });
    return;
  }

  try {
    // Fetch recent orders with printable statuses
    const endpoint = `${url}/wp-json/wc/v3/orders?status=processing,on-hold&per_page=50`;
    const response = await fetch(endpoint, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64'),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({
        error: `WooCommerce API error: ${response.status}`,
        details: errorText,
      });
      return;
    }

    const wooOrders = await response.json() as Array<{
      id: number;
      number: string;
      status: string;
      total: string;
      subtotal?: string;
      shipping_total?: string;
      total_tax?: string;
      customer_note?: string;
      billing: { first_name: string; last_name: string; email?: string };
      line_items: Array<{
        id: number;
        name: string;
        quantity: number;
        subtotal: string;
        total: string;
        meta_data?: Array<{
          id: number;
          key: string;
          value: string;
          display_key: string;
          display_value: string;
        }>;
      }>;
    }>;

    const results = {
      found: wooOrders.length,
      imported: 0,
      skipped: 0,
      orders: [] as Array<{ id: number; number: string; status: string; action: string }>,
    };

    for (const wooOrder of wooOrders) {
      const existing = await prisma.order.findUnique({
        where: { wooOrderId: wooOrder.id },
      });

      if (existing) {
        results.skipped++;
        results.orders.push({
          id: wooOrder.id,
          number: wooOrder.number,
          status: wooOrder.status,
          action: 'skipped (already exists)',
        });
      } else {
        await processWooCommerceOrder(wooOrder);
        results.imported++;
        results.orders.push({
          id: wooOrder.id,
          number: wooOrder.number,
          status: wooOrder.status,
          action: 'imported',
        });
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
