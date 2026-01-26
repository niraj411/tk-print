import { prisma } from '../lib/prisma.js';
import { queuePrintJob } from '../queues/print-queue.js';

interface WooLineItem {
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
}

interface WooOrder {
  id: number;
  number: string;
  status: string;
  total: string;
  subtotal?: string;
  shipping_total?: string;
  total_tax?: string;
  customer_note?: string;
  billing: {
    first_name: string;
    last_name: string;
    email?: string;
  };
  line_items: WooLineItem[];
}

export async function processWooCommerceOrder(wooOrder: WooOrder) {
  // Check if order already exists
  const existingOrder = await prisma.order.findUnique({
    where: { wooOrderId: wooOrder.id },
  });

  if (existingOrder) {
    console.log(`Order ${wooOrder.id} already processed, skipping`);
    return existingOrder;
  }

  // Transform line items
  const lineItems = wooOrder.line_items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    total: parseFloat(item.total),
    variations: item.meta_data
      ?.filter((meta) => !meta.key.startsWith('_'))
      .map((meta) => ({
        key: meta.display_key,
        value: meta.display_value,
      })) || [],
  }));

  // Calculate subtotal from line items if not provided
  const subtotal = wooOrder.subtotal
    ? parseFloat(wooOrder.subtotal)
    : lineItems.reduce((sum, item) => sum + item.total, 0);

  // Create order in database
  const order = await prisma.order.create({
    data: {
      wooOrderId: wooOrder.id,
      orderNumber: wooOrder.number,
      status: wooOrder.status,
      customerName: `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`.trim(),
      customerEmail: wooOrder.billing.email || null,
      lineItems: JSON.stringify(lineItems),
      subtotal,
      shippingTotal: parseFloat(wooOrder.shipping_total || '0'),
      taxTotal: parseFloat(wooOrder.total_tax || '0'),
      orderTotal: parseFloat(wooOrder.total),
      orderNotes: wooOrder.customer_note || null,
    },
  });

  // Create print jobs for both receipt and kitchen ticket
  const receiptJob = await prisma.printJob.create({
    data: {
      orderId: order.id,
      jobType: 'receipt',
      priority: 0,
    },
  });

  const kitchenJob = await prisma.printJob.create({
    data: {
      orderId: order.id,
      jobType: 'kitchen',
      priority: 10, // Higher priority for kitchen tickets
    },
  });

  // Queue print jobs
  await queuePrintJob(kitchenJob.id);
  await queuePrintJob(receiptJob.id);

  console.log(`Order ${wooOrder.number} processed and queued for printing`);

  return order;
}
