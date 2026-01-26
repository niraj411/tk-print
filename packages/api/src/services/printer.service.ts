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
