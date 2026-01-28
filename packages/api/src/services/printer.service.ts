import net from 'net';
import { Settings } from '@prisma/client';

export async function testPrinterConnection(settings: Settings): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 3000;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(settings.printerPort, settings.printerIp);
  });
}

export async function printTestReceipt(settings: Settings): Promise<void> {
  const { formatTestReceipt } = await import('../printing/receipt.formatter.js');
  const { sendToPrinter } = await import('../printing/printer.connection.js');

  const data = formatTestReceipt(settings);
  await sendToPrinter(settings, data);
}

export async function printTestKitchenTicket(settings: Settings): Promise<void> {
  const { formatKitchenTicket } = await import('../printing/kitchen.formatter.js');
  const { sendToPrinter } = await import('../printing/printer.connection.js');

  // Create a fake test order
  const testOrder = {
    id: 'test',
    wooOrderId: 12345,
    orderNumber: '12345',
    status: 'processing',
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    lineItems: JSON.stringify([
      {
        id: 1,
        name: 'Chicken Tikka Masala',
        quantity: 2,
        total: 25.98,
        variations: [
          { key: 'Size', value: 'Large' },
          { key: 'Spice', value: 'Medium' },
        ],
      },
      {
        id: 2,
        name: 'Garlic Naan',
        quantity: 3,
        total: 8.97,
        variations: [],
      },
    ]),
    subtotal: 34.95,
    shippingTotal: 0,
    taxTotal: 2.80,
    orderTotal: 37.75,
    orderNotes: 'No onions please!',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const data = formatKitchenTicket(testOrder as any, settings);
  await sendToPrinter(settings, data);
}
