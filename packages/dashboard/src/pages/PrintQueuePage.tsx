import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, RotateCcw, Trash2, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { api, PrintJob } from '@/lib/api';

function JobStatusIcon({ status }: { status: PrintJob['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
}

function PrintJobRow({
  job,
  onRetry,
  onDelete,
}: {
  job: PrintJob;
  onRetry: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
      <div className="flex items-center gap-4">
        <JobStatusIcon status={job.status} />
        <div>
          <div className="font-medium">
            Order #{job.order?.orderNumber || 'Unknown'}
            <Badge variant="outline" className="ml-2">
              {job.jobType}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {job.order?.customerName} &bull; {new Date(job.createdAt).toLocaleString()}
          </div>
          {job.lastError && (
            <div className="text-sm text-destructive mt-1">{job.lastError}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Attempts: {job.attempts}
        </div>
        {job.status === 'failed' && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RotateCcw className="h-4 w-4 mr-1" /> Retry
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrintQueuePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queueQuery = useQuery({
    queryKey: ['printJobs'],
    queryFn: () => api.getPrintJobs(),
    refetchInterval: 3000,
  });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => api.retryPrintJob(jobId),
    onSuccess: () => {
      toast({ title: 'Job queued for retry' });
      queryClient.invalidateQueries({ queryKey: ['printJobs'] });
    },
    onError: (error) => {
      toast({ title: 'Failed to retry job', description: String(error), variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => api.deletePrintJob(jobId),
    onSuccess: () => {
      toast({ title: 'Job deleted' });
      queryClient.invalidateQueries({ queryKey: ['printJobs'] });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete job', description: String(error), variant: 'destructive' });
    },
  });

  const pendingJobs = queueQuery.data?.jobs.filter((j) => j.status === 'pending' || j.status === 'processing') || [];
  const failedJobs = queueQuery.data?.jobs.filter((j) => j.status === 'failed') || [];
  const completedJobs = queueQuery.data?.jobs.filter((j) => j.status === 'completed').slice(0, 20) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Print Queue</h1>
        <Button variant="outline" onClick={() => queueQuery.refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Queue Status */}
      {queueQuery.data && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">
                {queueQuery.data.queueStatus.waiting}
              </div>
              <div className="text-sm text-muted-foreground">Waiting</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-yellow-600">
                {queueQuery.data.queueStatus.active}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">
                {queueQuery.data.queueStatus.completed}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-red-600">
                {queueQuery.data.queueStatus.failed}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active/Pending Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Active Jobs</CardTitle>
          <CardDescription>Currently processing or waiting</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No active jobs</div>
          ) : (
            <div className="space-y-2">
              {pendingJobs.map((job) => (
                <PrintJobRow
                  key={job.id}
                  job={job}
                  onRetry={() => retryMutation.mutate(job.id)}
                  onDelete={() => deleteMutation.mutate(job.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Failed Jobs */}
      <Card className={failedJobs.length > 0 ? 'border-destructive' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Failed Jobs
            {failedJobs.length > 0 && (
              <Badge variant="destructive">{failedJobs.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>Jobs that failed to print</CardDescription>
        </CardHeader>
        <CardContent>
          {failedJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No failed jobs</div>
          ) : (
            <div className="space-y-2">
              {failedJobs.map((job) => (
                <PrintJobRow
                  key={job.id}
                  job={job}
                  onRetry={() => retryMutation.mutate(job.id)}
                  onDelete={() => deleteMutation.mutate(job.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Completed */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Completed</CardTitle>
          <CardDescription>Last 20 completed print jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {completedJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No completed jobs</div>
          ) : (
            <div className="space-y-2">
              {completedJobs.map((job) => (
                <PrintJobRow
                  key={job.id}
                  job={job}
                  onRetry={() => retryMutation.mutate(job.id)}
                  onDelete={() => deleteMutation.mutate(job.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
