import { prisma } from '../lib/prisma.js';
import { processWooCommerceOrder } from './order.service.js';

const POLL_INTERVAL = 60000; // 60 seconds
let pollTimer: ReturnType<typeof setInterval> | null = null;

interface WooCommerceOrder {
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
  line_items: Array<{
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
  }>;
}

async function fetchProcessingOrders(): Promise<WooCommerceOrder[]> {
  const url = process.env.WOOCOMMERCE_URL;
  const key = process.env.WOOCOMMERCE_KEY;
  const secret = process.env.WOOCOMMERCE_SECRET;

  if (!url || !key || !secret) {
    console.warn('WooCommerce credentials not configured, skipping poll');
    return [];
  }

  // Check for both processing and on-hold orders (common for restaurant/food orders)
  const endpoint = `${url}/wp-json/wc/v3/orders?status=processing,on-hold&per_page=20`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64'),
    },
  });

  if (!response.ok) {
    throw new Error(`WooCommerce API error: ${response.status}`);
  }

  return response.json() as Promise<WooCommerceOrder[]>;
}

async function pollForOrders() {
  try {
    const orders = await fetchProcessingOrders();

    for (const order of orders) {
      // Check if we already have this order
      const existing = await prisma.order.findUnique({
        where: { wooOrderId: order.id },
      });

      if (!existing) {
        console.log(`Polling: Found new order ${order.number}`);
        await processWooCommerceOrder(order);
      }
    }
  } catch (error) {
    console.error('Polling error:', error);
  }
}

export function startPollingFallback() {
  if (pollTimer) return;

  console.log('Starting WooCommerce polling fallback');
  pollTimer = setInterval(pollForOrders, POLL_INTERVAL);

  // Run immediately on start
  pollForOrders();
}

export function stopPollingFallback() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log('Stopped WooCommerce polling fallback');
  }
}
