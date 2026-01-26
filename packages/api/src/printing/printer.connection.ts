import net from 'net';
import { Settings } from '@prisma/client';

export async function sendToPrinter(settings: Settings, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 10000;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.write(data, (err) => {
        if (err) {
          socket.destroy();
          reject(err);
        } else {
          // Give printer time to process before closing
          setTimeout(() => {
            socket.end();
          }, 500);
        }
      });
    });

    socket.on('close', () => {
      resolve();
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Printer connection timeout'));
    });

    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });

    socket.connect(settings.printerPort, settings.printerIp);
  });
}
