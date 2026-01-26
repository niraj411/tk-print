import { Settings, Order } from '@prisma/client';
import * as esc from './escpos.js';

interface LineItem {
  id: number;
  name: string;
  quantity: number;
  total: number;
  variations?: Array<{ key: string; value: string }>;
}

export function formatReceipt(order: Order, settings: Settings): Buffer {
  const lineItems: LineItem[] = JSON.parse(order.lineItems);
  const width = settings.receiptWidth;

  const parts: Buffer[] = [
    esc.INIT,

    // Header
    esc.ALIGN_CENTER,
    esc.BOLD_ON,
    esc.DOUBLE_SIZE_ON,
    esc.line(settings.storeName),
    esc.NORMAL_SIZE,
    esc.BOLD_OFF,
  ];

  if (settings.storeAddress) {
    parts.push(esc.line(settings.storeAddress));
  }
  if (settings.storePhone) {
    parts.push(esc.line(settings.storePhone));
  }

  parts.push(
    esc.FEED_LINE,
    esc.separator('=', width),

    // Order info
    esc.ALIGN_LEFT,
    esc.BOLD_ON,
    esc.line(`Order #${order.orderNumber}`),
    esc.BOLD_OFF,
    esc.line(esc.formatDateTime(order.createdAt)),
    esc.FEED_LINE,

    // Customer
    esc.line(`Customer: ${order.customerName}`),
    esc.separator('-', width),
    esc.FEED_LINE,
  );

  // Line items
  for (const item of lineItems) {
    const itemLine = `${item.quantity}x ${item.name}`;
    const priceLine = esc.formatCurrency(item.total);
    parts.push(esc.line(esc.padLine(itemLine, priceLine, width)));

    // Variations
    if (item.variations && item.variations.length > 0) {
      for (const variation of item.variations) {
        parts.push(esc.line(`   ${variation.key}: ${variation.value}`));
      }
    }
  }

  parts.push(
    esc.FEED_LINE,
    esc.separator('-', width),
  );

  // Totals
  parts.push(
    esc.line(esc.padLine('Subtotal:', esc.formatCurrency(order.subtotal), width)),
  );

  if (order.shippingTotal > 0) {
    parts.push(
      esc.line(esc.padLine('Shipping:', esc.formatCurrency(order.shippingTotal), width)),
    );
  }

  if (order.taxTotal > 0) {
    parts.push(
      esc.line(esc.padLine('Tax:', esc.formatCurrency(order.taxTotal), width)),
    );
  }

  parts.push(
    esc.separator('-', width),
    esc.BOLD_ON,
    esc.line(esc.padLine('TOTAL:', esc.formatCurrency(order.orderTotal), width)),
    esc.BOLD_OFF,
    esc.FEED_LINE,
  );

  // Order notes
  if (order.orderNotes) {
    parts.push(
      esc.separator('-', width),
      esc.BOLD_ON,
      esc.line('Notes:'),
      esc.BOLD_OFF,
      esc.line(order.orderNotes),
      esc.FEED_LINE,
    );
  }

  // Footer
  parts.push(
    esc.ALIGN_CENTER,
    esc.FEED_LINE,
    esc.line(settings.storeFooter),
    esc.FEED_LINES(4),
    esc.CUT_PAPER,
  );

  return esc.combine(...parts);
}

export function formatTestReceipt(settings: Settings): Buffer {
  const width = settings.receiptWidth;

  return esc.combine(
    esc.INIT,
    esc.ALIGN_CENTER,
    esc.BOLD_ON,
    esc.DOUBLE_SIZE_ON,
    esc.line(settings.storeName),
    esc.NORMAL_SIZE,
    esc.BOLD_OFF,
    esc.FEED_LINE,
    esc.separator('=', width),
    esc.FEED_LINE,
    esc.line('*** TEST PRINT ***'),
    esc.FEED_LINE,
    esc.line(esc.formatDateTime(new Date())),
    esc.FEED_LINE,
    esc.line('Printer connection successful!'),
    esc.FEED_LINE,
    esc.separator('=', width),
    esc.FEED_LINE,
    esc.line(settings.storeFooter),
    esc.FEED_LINES(4),
    esc.CUT_PAPER,
  );
}
