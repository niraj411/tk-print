import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { prisma } from '../lib/prisma.js';
import { queuePrintJob, getQueueStatus } from '../queues/print-queue.js';

export const printJobsRouter: RouterType = Router();

printJobsRouter.get('/', async (req: Request, res: Response) => {
  const status = req.query.status ? String(req.query.status) : undefined;

  const where = status ? { status } : {};

  const jobs = await prisma.printJob.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      order: {
        select: {
          orderNumber: true,
          customerName: true,
        },
      },
    },
  });

  const queueStatus = await getQueueStatus();

  res.json({ jobs, queueStatus });
});

printJobsRouter.post('/:id/retry', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const job = await prisma.printJob.findUnique({
    where: { id },
  });

  if (!job) {
    res.status(404).json({ error: 'Print job not found' });
    return;
  }

  // Reset job status
  await prisma.printJob.update({
    where: { id: job.id },
    data: {
      status: 'pending',
      lastError: null,
    },
  });

  await queuePrintJob(job.id);

  res.json({ success: true });
});

printJobsRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await prisma.printJob.delete({
    where: { id },
  });

  res.json({ success: true });
});
