import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, AlertTriangle, Printer, Database, Server } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, Order, QueueStatus, HealthStatus } from '@/lib/api';

function StatusIndicator({ status }: { status: boolean }) {
  return status ? (
    <CheckCircle className="h-5 w-5 text-green-500" />
  ) : (
    <XCircle className="h-5 w-5 text-red-500" />
  );
}

function QueueCard({ queueStatus }: { queueStatus: QueueStatus }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Print Queue
        </CardTitle>
        <CardDescription>Current queue status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{queueStatus.waiting}</div>
            <div className="text-sm text-muted-foreground">Waiting</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-3xl font-bold text-yellow-600">{queueStatus.active}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{queueStatus.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-3xl font-bold text-red-600">{queueStatus.failed}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthCard({ health }: { health: HealthStatus }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          System Health
        </CardTitle>
        <CardDescription>
          Status:{' '}
          <Badge variant={health.status === 'healthy' ? 'success' : 'destructive'}>
            {health.status}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Database</span>
            </div>
            <StatusIndicator status={health.checks.database} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              <span>Redis</span>
            </div>
            <StatusIndicator status={health.checks.redis} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              <span>Printer</span>
            </div>
            <StatusIndicator status={health.checks.printer} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentOrdersCard({ orders }: { orders: Order[] }) {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardDescription>Latest orders processed</CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No orders yet</div>
        ) : (
          <div className="space-y-4">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div>
                  <div className="font-medium">Order #{order.orderNumber}</div>
                  <div className="text-sm text-muted-foreground">{order.customerName}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${order.orderTotal.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-1">
                  {order.printJobs?.map((job) => (
                    <Badge
                      key={job.id}
                      variant={
                        job.status === 'completed'
                          ? 'success'
                          : job.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {job.jobType}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 10000,
  });

  const queueQuery = useQuery({
    queryKey: ['printJobs'],
    queryFn: () => api.getPrintJobs(),
    refetchInterval: 5000,
  });

  const ordersQuery = useQuery({
    queryKey: ['orders', { page: 1, limit: 5 }],
    queryFn: () => api.getOrders({ page: 1, limit: 5 }),
    refetchInterval: 10000,
  });

  if (healthQuery.isLoading || queueQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (healthQuery.error || queueQuery.error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to connect to API. Make sure the server is running.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {healthQuery.data && <HealthCard health={healthQuery.data} />}
        {queueQuery.data && <QueueCard queueStatus={queueQuery.data.queueStatus} />}
        {ordersQuery.data && <RecentOrdersCard orders={ordersQuery.data.orders} />}
      </div>
    </div>
  );
}
