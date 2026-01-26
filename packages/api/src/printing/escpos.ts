// ESC/POS Command Constants for Star mC-Print3

// Control codes
export const ESC = 0x1b;
export const GS = 0x1d;
export const LF = 0x0a;

// Initialize printer
export const INIT = Buffer.from([ESC, 0x40]);

// Text formatting
export const BOLD_ON = Buffer.from([ESC, 0x45, 0x01]);
export const BOLD_OFF = Buffer.from([ESC, 0x45, 0x00]);
export const UNDERLINE_ON = Buffer.from([ESC, 0x2d, 0x01]);
export const UNDERLINE_OFF = Buffer.from([ESC, 0x2d, 0x00]);
export const DOUBLE_HEIGHT_ON = Buffer.from([GS, 0x21, 0x01]);
export const DOUBLE_WIDTH_ON = Buffer.from([GS, 0x21, 0x10]);
export const DOUBLE_SIZE_ON = Buffer.from([GS, 0x21, 0x11]);
export const NORMAL_SIZE = Buffer.from([GS, 0x21, 0x00]);

// Text alignment
export const ALIGN_LEFT = Buffer.from([ESC, 0x61, 0x00]);
export const ALIGN_CENTER = Buffer.from([ESC, 0x61, 0x01]);
export const ALIGN_RIGHT = Buffer.from([ESC, 0x61, 0x02]);

// Paper cutting
export const CUT_PAPER = Buffer.from([GS, 0x56, 0x41, 0x03]);
export const PARTIAL_CUT = Buffer.from([GS, 0x56, 0x42, 0x00]);

// Line feed
export const FEED_LINE = Buffer.from([LF]);
export const FEED_LINES = (n: number) => Buffer.from([ESC, 0x64, n]);

// Character code table (for extended characters)
export const CODE_PAGE_PC437 = Buffer.from([ESC, 0x74, 0x00]);
export const CODE_PAGE_PC850 = Buffer.from([ESC, 0x74, 0x02]);

// Create text buffer with encoding
export function text(str: string): Buffer {
  return Buffer.from(str, 'utf-8');
}

// Create a line of text with newline
export function line(str: string): Buffer {
  return Buffer.concat([text(str), FEED_LINE]);
}

// Create a separator line
export function separator(char: string = '-', width: number = 48): Buffer {
  return line(char.repeat(width));
}

// Format currency
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// Pad string for receipt formatting
export function padLine(left: string, right: string, width: number = 48): string {
  const padding = width - left.length - right.length;
  if (padding <= 0) {
    return left.substring(0, width - right.length - 1) + ' ' + right;
  }
  return left + ' '.repeat(padding) + right;
}

// Format date/time
export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format time only
export function formatTime(date: Date): string {
  return date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Combine multiple buffers
export function combine(...buffers: Buffer[]): Buffer {
  return Buffer.concat(buffers);
}
