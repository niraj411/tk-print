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
  // For 72mm paper, ~42 chars normal, ~21 chars double width
  const width = 42;

  const divider = '='.repeat(width);
  const thinDivider = '-'.repeat(width);

  const parts: Buffer[] = [
    esc.INIT,
    esc.FEED_LINE,

    // === ORDER NUMBER - VERY BIG ===
    esc.ALIGN_CENTER,
    esc.BOLD_ON,
    esc.DOUBLE_SIZE_ON,
    esc.line('ORDER'),
    esc.line(`#${order.orderNumber}`),
    esc.NORMAL_SIZE,
    esc.BOLD_OFF,
    esc.FEED_LINE,

    // === CUSTOMER NAME - BIG ===
    esc.line(divider),
    esc.FEED_LINE,
    esc.BOLD_ON,
    esc.DOUBLE_SIZE_ON,
    esc.line(order.customerName.toUpperCase()),
    esc.NORMAL_SIZE,
    esc.BOLD_OFF,
    esc.FEED_LINE,
    esc.line(divider),
    esc.FEED_LINE,
    esc.FEED_LINE,
  ];

  // === ORDER ITEMS - LARGE AND CLEAR ===
  for (const item of lineItems) {
    // Quantity big and bold
    parts.push(
      esc.ALIGN_CENTER,
      esc.BOLD_ON,
      esc.DOUBLE_SIZE_ON,
      esc.line(`${item.quantity}x`),
      esc.FEED_LINE,
      // Item name
      esc.line(item.name.toUpperCase()),
      esc.NORMAL_SIZE,
      esc.BOLD_OFF,
    );

    // Variations/modifications
    if (item.variations && item.variations.length > 0) {
      parts.push(esc.FEED_LINE);
      for (const variation of item.variations) {
        parts.push(
          esc.BOLD_ON,
          esc.DOUBLE_HEIGHT_ON,
          esc.line(`> ${variation.value.toUpperCase()}`),
          esc.NORMAL_SIZE,
          esc.BOLD_OFF,
        );
      }
    }

    parts.push(
      esc.FEED_LINE,
      esc.line(thinDivider),
      esc.FEED_LINE,
    );
  }

  // === SPECIAL INSTRUCTIONS - VERY PROMINENT ===
  if (order.orderNotes) {
    parts.push(
      esc.FEED_LINE,
      esc.ALIGN_CENTER,
      esc.BOLD_ON,
      esc.DOUBLE_SIZE_ON,
      esc.line('** NOTES **'),
      esc.FEED_LINE,
      esc.line(order.orderNotes.toUpperCase()),
      esc.NORMAL_SIZE,
      esc.BOLD_OFF,
      esc.FEED_LINE,
    );
  }

  // === TIME ORDERED ===
  parts.push(
    esc.FEED_LINE,
    esc.line(divider),
    esc.ALIGN_CENTER,
    esc.BOLD_ON,
    esc.line(`ORDERED: ${esc.formatDateTime(order.createdAt)}`),
    esc.BOLD_OFF,
    esc.line(divider),
  );

  // Feed and cut
  parts.push(
    esc.FEED_LINES(5),
    esc.CUT_PAPER,
  );

  return esc.combine(...parts);
}
