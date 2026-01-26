import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Printer, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api, Settings } from '@/lib/api';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<Settings>>({});

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: api.getSettings,
  });

  const connectionQuery = useQuery({
    queryKey: ['printerConnection'],
    queryFn: api.testConnection,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setFormData(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Settings>) => api.updateSettings(data),
    onSuccess: () => {
      toast({ title: 'Settings saved' });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => {
      toast({ title: 'Failed to save settings', description: String(error), variant: 'destructive' });
    },
  });

  const testPrintMutation = useMutation({
    mutationFn: api.testPrint,
    onSuccess: () => {
      toast({ title: 'Test print sent' });
    },
    onError: (error) => {
      toast({ title: 'Test print failed', description: String(error), variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }));
  };

  if (settingsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Printer Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Printer Configuration
            </CardTitle>
            <CardDescription>Configure your Star mC-Print3 connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <span className="font-medium">Connection Status:</span>
              {connectionQuery.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : connectionQuery.data?.connected ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-5 w-5" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-5 w-5" /> Disconnected
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => connectionQuery.refetch()}
              >
                Test
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="printerIp">Printer IP Address</Label>
                <Input
                  id="printerIp"
                  name="printerIp"
                  value={formData.printerIp || ''}
                  onChange={handleChange}
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="printerPort">Port</Label>
                <Input
                  id="printerPort"
                  name="printerPort"
                  type="number"
                  value={formData.printerPort || 9100}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiptWidth">Receipt Width (characters)</Label>
              <Input
                id="receiptWidth"
                name="receiptWidth"
                type="number"
                value={formData.receiptWidth || 48}
                onChange={handleChange}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => testPrintMutation.mutate()}
              disabled={testPrintMutation.isPending}
            >
              {testPrintMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              Send Test Print
            </Button>
          </CardContent>
        </Card>

        {/* Store Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
            <CardDescription>This information appears on receipts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name</Label>
              <Input
                id="storeName"
                name="storeName"
                value={formData.storeName || ''}
                onChange={handleChange}
                placeholder="My Restaurant"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeAddress">Address</Label>
              <Input
                id="storeAddress"
                name="storeAddress"
                value={formData.storeAddress || ''}
                onChange={handleChange}
                placeholder="123 Main St, City, State 12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storePhone">Phone</Label>
              <Input
                id="storePhone"
                name="storePhone"
                value={formData.storePhone || ''}
                onChange={handleChange}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeFooter">Receipt Footer Message</Label>
              <Input
                id="storeFooter"
                name="storeFooter"
                value={formData.storeFooter || ''}
                onChange={handleChange}
                placeholder="Thank you for your order!"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
