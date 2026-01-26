import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Printer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { api, Order } from '@/lib/api';

function OrderRow({ order, onReprint }: { order: Order; onReprint: (type: 'receipt' | 'kitchen' | 'both') => void }) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">#{order.orderNumber}</span>
            <Badge variant="outline">{order.status}</Badge>
          </div>
          <div className="text-muted-foreground">{order.customerName}</div>
          <div className="text-sm text-muted-foreground">
            {new Date(order.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-lg">${order.orderTotal.toFixed(2)}</div>
          <div className="flex gap-1 mt-1">
            {order.printJobs?.map((job) => (
              <Badge
                key={job.id}
                variant={
                  job.status === 'completed'
                    ? 'success'
                    : job.status === 'failed'
                    ? 'destructive'
                    : job.status === 'processing'
                    ? 'warning'
                    : 'secondary'
                }
              >
                {job.jobType} {job.status === 'failed' && `(${job.attempts})`}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="text-sm font-medium mb-2">Items:</div>
        <ul className="text-sm space-y-1">
          {order.lineItems.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.quantity}x {item.name}
                {item.variations && item.variations.length > 0 && (
                  <span className="text-muted-foreground ml-2">
                    ({item.variations.map((v) => `${v.key}: ${v.value}`).join(', ')})
                  </span>
                )}
              </span>
              <span>${item.total.toFixed(2)}</span>
            </li>
          ))}
        </ul>
        {order.orderNotes && (
          <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
            <strong>Notes:</strong> {order.orderNotes}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onReprint('receipt')}>
          <Printer className="h-4 w-4 mr-1" /> Receipt
        </Button>
        <Button size="sm" variant="outline" onClick={() => onReprint('kitchen')}>
          <Printer className="h-4 w-4 mr-1" /> Kitchen
        </Button>
        <Button size="sm" onClick={() => onReprint('both')}>
          <Printer className="h-4 w-4 mr-1" /> Both
        </Button>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const ordersQuery = useQuery({
    queryKey: ['orders', { page, search }],
    queryFn: () => api.getOrders({ page, limit: 10, search }),
  });

  const reprintMutation = useMutation({
    mutationFn: ({ orderId, jobType }: { orderId: string; jobType: 'receipt' | 'kitchen' | 'both' }) =>
      api.reprintOrder(orderId, jobType),
    onSuccess: () => {
      toast({ title: 'Print job queued' });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      toast({ title: 'Failed to queue print job', description: String(error), variant: 'destructive' });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Orders</h1>
        <Button variant="outline" onClick={() => ordersQuery.refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search by order number or customer name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {ordersQuery.isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : ordersQuery.error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive">Failed to load orders</CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {ordersQuery.data?.orders.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No orders found
                </CardContent>
              </Card>
            ) : (
              ordersQuery.data?.orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onReprint={(type) => reprintMutation.mutate({ orderId: order.id, jobType: type })}
                />
              ))
            )}
          </div>

          {ordersQuery.data && ordersQuery.data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {ordersQuery.data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === ordersQuery.data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
