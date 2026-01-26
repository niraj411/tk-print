import { Order, Settings } from '@prisma/client';
import * as esc from './escpos.js';

interface LineItem {
  id: number;
  name: string;
  quantity: number;
  total: number;
  variations?: Array<{ key: string; value: string }>;
}

export function formatKitchenTicket(order: Order, settings: Settings): Buffer {
  const lineItems: LineItem[] = JSON.parse(order.lineItems);
  const width = settings.receiptWidth;

  const parts: Buffer[] = [
    esc.INIT,

    // Large header
    esc.ALIGN_CENTER,
    esc.BOLD_ON,
    esc.DOUBLE_SIZE_ON,
    esc.line('** KITCHEN ORDER **'),
    esc.FEED_LINE,

    // Order number - very prominent
    esc.line(`#${order.orderNumber}`),
    esc.NORMAL_SIZE,
    esc.BOLD_OFF,
    esc.FEED_LINE,

    esc.separator('=', width),

    // Time and customer
    esc.ALIGN_LEFT,
    esc.BOLD_ON,
    esc.line(`Time: ${esc.formatTime(order.createdAt)}`),
    esc.line(`Customer: ${order.customerName}`),
    esc.BOLD_OFF,
    esc.FEED_LINE,
    esc.separator('-', width),
    esc.FEED_LINE,
  ];

  // Line items - larger format for kitchen readability
  for (const item of lineItems) {
    // Quantity and name in larger text
    parts.push(
      esc.BOLD_ON,
      esc.DOUBLE_HEIGHT_ON,
      esc.line(`${item.quantity}x ${item.name}`),
      esc.NORMAL_SIZE,
      esc.BOLD_OFF,
    );

    // Variations/modifications prominently displayed
    if (item.variations && item.variations.length > 0) {
      for (const variation of item.variations) {
        parts.push(
          esc.BOLD_ON,
          esc.line(`   -> ${variation.key}: ${variation.value}`),
          esc.BOLD_OFF,
        );
      }
    }

    parts.push(esc.FEED_LINE);
  }

  // Order notes - highlighted
  if (order.orderNotes) {
    parts.push(
      esc.separator('*', width),
      esc.ALIGN_CENTER,
      esc.BOLD_ON,
      esc.DOUBLE_HEIGHT_ON,
      esc.line('SPECIAL INSTRUCTIONS'),
      esc.NORMAL_SIZE,
      esc.FEED_LINE,
      esc.ALIGN_LEFT,
      esc.line(order.orderNotes),
      esc.BOLD_OFF,
      esc.separator('*', width),
    );
  }

  parts.push(
    esc.FEED_LINES(4),
    esc.CUT_PAPER,
  );

  return esc.combine(...parts);
}
