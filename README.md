# TK-Print

A self-hosted print service that automatically prints customer receipts and kitchen tickets when WooCommerce orders transition to "processing" status.

## Features

- **Automatic Order Printing**: Receives WooCommerce webhooks and prints receipts/kitchen tickets
- **Polling Fallback**: Catches missed webhooks with 60-second polling
- **Print Queue**: BullMQ-based job queue with retry logic (5 attempts, exponential backoff)
- **Web Dashboard**: Manage orders, print queue, and settings
- **ESC/POS Support**: Works with Star mC-Print3 and compatible thermal printers

## Architecture

```
WooCommerce Store ──webhook──> Print Service API ──TCP:9100──> Star mC-Print3
                                     │
                              ┌──────┴──────┐
                              │   Redis     │
                              │  (BullMQ)   │
                              └─────────────┘
                                     │
                              ┌──────┴──────┐
                              │   SQLite    │
                              │  (Orders)   │
                              └─────────────┘
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Star mC-Print3 (or compatible) printer on your network
- WooCommerce store with REST API access

### 1. Clone and Configure

```bash
cd tk-print/docker
cp .env.example .env
# Edit .env with your WooCommerce credentials
```

### 2. Start the Service

```bash
docker compose up -d
```

### 3. Access Dashboard

Open http://localhost:3000 in your browser.

### 4. Configure WooCommerce Webhook

In WooCommerce:
1. Go to Settings > Advanced > Webhooks
2. Add new webhook:
   - **Name**: TK-Print Order Updated
   - **Status**: Active
   - **Topic**: Order updated
   - **Delivery URL**: `http://your-server:3000/api/webhooks/woocommerce`
   - **Secret**: Your WEBHOOK_SECRET from .env

## Development

### Prerequisites

- Node.js 22+
- pnpm 9+
- Redis (for BullMQ)

### Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Push database schema
pnpm db:push

# Start development servers
pnpm dev
```

The API runs on http://localhost:3000 and the dashboard on http://localhost:5173.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/woocommerce` | POST | WooCommerce webhook receiver |
| `/api/orders` | GET | List orders (paginated) |
| `/api/orders/:id` | GET | Get single order |
| `/api/orders/:id/reprint` | POST | Reprint order |
| `/api/print-jobs` | GET | List print jobs |
| `/api/print-jobs/:id/retry` | POST | Retry failed job |
| `/api/settings` | GET/PUT | Manage settings |
| `/api/settings/test-print` | POST | Send test print |
| `/api/health` | GET | System health check |
| `/api/health/printer` | GET | Printer status |

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WOOCOMMERCE_URL` | WooCommerce store URL | - |
| `WOOCOMMERCE_KEY` | REST API consumer key | - |
| `WOOCOMMERCE_SECRET` | REST API consumer secret | - |
| `WEBHOOK_SECRET` | Webhook signature secret | - |
| `PRINTER_IP` | Printer IP address | 192.168.1.100 |
| `PRINTER_PORT` | Printer port | 9100 |
| `REDIS_URL` | Redis connection URL | redis://localhost:6379 |
| `PORT` | API server port | 3000 |

### Network Requirements

1. **Outbound**: Access to WooCommerce REST API (for polling)
2. **Inbound**: WooCommerce must reach the webhook endpoint
3. **Local**: TCP access to printer on port 9100

**Webhook accessibility options:**
- Public IP with port forwarding
- Cloudflare Tunnel (recommended)
- Same network if WooCommerce is self-hosted

## Print Formats

### Customer Receipt
- Store header (name, address, phone)
- Order number and date
- Customer info
- Line items with variations
- Subtotal, shipping, tax, total
- Custom footer message

### Kitchen Ticket
- Large "KITCHEN ORDER" header
- Order number and time (prominent)
- Customer name
- Items in large font with quantities
- Special instructions highlighted

## License

MIT
