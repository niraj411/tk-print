import { Queue, Worker, Job } from 'bullmq';
import { createRedisConnection } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { sendToPrinter } from '../printing/printer.connection.js';
import { formatReceipt } from '../printing/receipt.formatter.js';
import { formatKitchenTicket } from '../printing/kitchen.formatter.js';

const QUEUE_NAME = 'print-jobs';

let queue: Queue | null = null;
let worker: Worker | null = null;

interface PrintJobData {
  printJobId: string;
}

async function processPrintJob(job: Job<PrintJobData>) {
  const { printJobId } = job.data;

  // Get print job from database
  const printJob = await prisma.printJob.findUnique({
    where: { id: printJobId },
    include: { order: true },
  });

  if (!printJob) {
    throw new Error(`Print job ${printJobId} not found`);
  }

  // Update status to processing
  await prisma.printJob.update({
    where: { id: printJobId },
    data: {
      status: 'processing',
      attempts: printJob.attempts + 1,
      queueJobId: job.id,
    },
  });

  // Get settings
  const settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    throw new Error('Settings not found');
  }

  // Format the print data based on job type
  let printData: Buffer;
  if (printJob.jobType === 'kitchen') {
    printData = formatKitchenTicket(printJob.order, settings);
  } else {
    printData = formatReceipt(printJob.order, settings);
  }

  // Send to printer
  await sendToPrinter(settings, printData);

  // Update job as completed
  await prisma.printJob.update({
    where: { id: printJobId },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });

  console.log(`Print job ${printJobId} (${printJob.jobType}) completed for order ${printJob.order.orderNumber}`);
}

export async function setupQueue() {
  const connection = createRedisConnection();

  queue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5 seconds
      },
      removeOnComplete: 100,
      removeOnFail: false,
    },
  });

  worker = new Worker(QUEUE_NAME, processPrintJob, {
    connection: createRedisConnection(),
    concurrency: 1, // Sequential printing
  });

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);

    if (job) {
      const { printJobId } = job.data as PrintJobData;
      await prisma.printJob.update({
        where: { id: printJobId },
        data: {
          status: job.attemptsMade >= (job.opts.attempts || 5) ? 'failed' : 'pending',
          lastError: err.message,
        },
      });
    }
  });

  console.log('Print queue initialized');
}

export async function queuePrintJob(printJobId: string) {
  if (!queue) {
    throw new Error('Queue not initialized');
  }

  // Get job to check priority
  const printJob = await prisma.printJob.findUnique({
    where: { id: printJobId },
  });

  await queue.add(
    'print',
    { printJobId },
    {
      priority: printJob ? 10 - printJob.priority : 10, // Lower number = higher priority in BullMQ
    }
  );
}

export async function getQueueStatus() {
  if (!queue) {
    return { waiting: 0, active: 0, completed: 0, failed: 0 };
  }

  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

export async function closeQueue() {
  if (worker) {
    await worker.close();
  }
  if (queue) {
    await queue.close();
  }
}
