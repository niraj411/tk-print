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

  const divider = '='.repeat(width);
  const thinDivider = '-'.repeat(width);

  const parts: Buffer[] = [
    esc.INIT,

    // === ORDER NUMBER - BIG AND PROMINENT ===
    esc.ALIGN_CENTER,
    esc.BOLD_ON,
    esc.DOUBLE_SIZE_ON,
    esc.line(`ORDER #${order.orderNumber}`),
    esc.NORMAL_SIZE,
    esc.BOLD_OFF,
    esc.FEED_LINE,

    // === CUSTOMER INFO ===
    esc.line(divider),
    esc.BOLD_ON,
    esc.DOUBLE_HEIGHT_ON,
    esc.line(`NAME: ${order.customerName.toUpperCase()}`),
    esc.NORMAL_SIZE,
    esc.BOLD_OFF,
  ];

  // Add phone if available (from email field or could parse from notes)
  if (order.customerEmail) {
    parts.push(esc.line(`EMAIL: ${order.customerEmail.toUpperCase()}`));
  }

  parts.push(
    esc.line(divider),
    esc.FEED_LINE,
  );

  // === ORDER ITEMS ===
  parts.push(
    esc.ALIGN_CENTER,
    esc.BOLD_ON,
    esc.line('** ORDER ITEMS **'),
    esc.BOLD_OFF,
    esc.FEED_LINE,
    esc.ALIGN_LEFT,
  );

  for (const item of lineItems) {
    // Item line: QTY X PRODUCT NAME
    parts.push(
      esc.BOLD_ON,
      esc.DOUBLE_HEIGHT_ON,
      esc.line(`${item.quantity}X ${item.name.toUpperCase()}`),
      esc.NORMAL_SIZE,
      esc.BOLD_OFF,
    );

    // Variations/modifications indented
    if (item.variations && item.variations.length > 0) {
      for (const variation of item.variations) {
        parts.push(
          esc.line(`   > ${variation.key}: ${variation.value}`),
        );
      }
    }

    parts.push(esc.FEED_LINE);
  }

  // === SPECIAL INSTRUCTIONS ===
  if (order.orderNotes) {
    parts.push(
      esc.line(divider),
      esc.ALIGN_CENTER,
      esc.BOLD_ON,
      esc.DOUBLE_HEIGHT_ON,
      esc.line('*** SPECIAL INSTRUCTIONS ***'),
      esc.NORMAL_SIZE,
      esc.FEED_LINE,
      esc.ALIGN_LEFT,
      esc.line(order.orderNotes.toUpperCase()),
      esc.BOLD_OFF,
      esc.line(divider),
    );
  }

  // === TIME ORDERED (at the bottom) ===
  parts.push(
    esc.FEED_LINE,
    esc.line(thinDivider),
    esc.ALIGN_CENTER,
    esc.line(`TIME ORDERED: ${esc.formatDateTime(order.createdAt)}`),
    esc.line(thinDivider),
  );

  parts.push(
    esc.FEED_LINES(4),
    esc.CUT_PAPER,
  );

  return esc.combine(...parts);
}
