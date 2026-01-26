const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface Order {
  id: string;
  wooOrderId: number;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail?: string;
  lineItems: LineItem[];
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  orderTotal: number;
  orderNotes?: string;
  createdAt: string;
  printJobs?: PrintJob[];
}

export interface LineItem {
  id: number;
  name: string;
  quantity: number;
  total: number;
  variations?: Array<{ key: string; value: string }>;
}

export interface PrintJob {
  id: string;
  orderId: string;
  jobType: 'receipt' | 'kitchen';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  lastError?: string;
  createdAt: string;
  completedAt?: string;
  order?: {
    orderNumber: string;
    customerName: string;
  };
}

export interface Settings {
  id: string;
  printerIp: string;
  printerPort: number;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeFooter: string;
  receiptWidth: number;
}

export interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  checks: {
    database: boolean;
    redis: boolean;
    printer: boolean;
  };
}

export const api = {
  // Orders
  getOrders: (params?: { page?: number; limit?: number; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    return fetchApi<{ orders: Order[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/orders?${searchParams}`
    );
  },

  getOrder: (id: string) => fetchApi<Order>(`/orders/${id}`),

  reprintOrder: (id: string, jobType: 'receipt' | 'kitchen' | 'both') =>
    fetchApi<{ success: boolean; jobs: PrintJob[] }>(`/orders/${id}/reprint`, {
      method: 'POST',
      body: JSON.stringify({ jobType }),
    }),

  // Print Jobs
  getPrintJobs: (status?: string) =>
    fetchApi<{ jobs: PrintJob[]; queueStatus: QueueStatus }>(
      `/print-jobs${status ? `?status=${status}` : ''}`
    ),

  retryPrintJob: (id: string) =>
    fetchApi<{ success: boolean }>(`/print-jobs/${id}/retry`, { method: 'POST' }),

  deletePrintJob: (id: string) =>
    fetchApi<{ success: boolean }>(`/print-jobs/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => fetchApi<Settings>('/settings'),

  updateSettings: (settings: Partial<Settings>) =>
    fetchApi<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  testPrint: () => fetchApi<{ success: boolean }>('/settings/test-print', { method: 'POST' }),

  testConnection: () => fetchApi<{ connected: boolean }>('/settings/test-connection'),

  // Health
  getHealth: () => fetchApi<HealthStatus>('/health'),

  getPrinterHealth: () => fetchApi<{ connected: boolean }>('/health/printer'),
};
