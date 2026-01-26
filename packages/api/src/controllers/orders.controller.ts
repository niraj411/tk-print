import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { prisma } from '../lib/prisma.js';
import { queuePrintJob } from '../queues/print-queue.js';

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
