# Vibr8Vault Web UI

Web interface for [Vibr8Vault](https://vault.vibr8lab.work), built with Next.js 16 and the [`@vibr8vault/sdk`](https://www.npmjs.com/package/@vibr8vault/sdk) TypeScript SDK.

## Features

- Dashboard with vault health, seal status, and quick navigation
- Secret management with namespace-scoped browsing and versioning
- Token lifecycle — create, list, and revoke service/ephemeral/operator tokens
- User management with policy assignment (admin)
- Namespace management (admin)
- Policy editor with YAML quick-builder (admin)
- Audit log viewer with advanced filtering (admin)
- Dark mode support

## Prerequisites

- **Node.js** >= 20
- **npm** >= 10
- A running **Vibr8Vault server** ([backend docs](https://github.com/vibr8soft/Vibr8Vault))

## Local Development

### 1. Start the Vibr8Vault backend

The quickest way is dev mode (in-memory, auto-unsealed):

```bash
./vibr8vault --dev
```

This starts the API on `http://localhost:8200`.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` if your backend runs on a different address:

```
NEXT_PUBLIC_API_URL=http://localhost:8200
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The page hot-reloads as you edit.

### 5. Login

In dev mode the backend prints root credentials on startup. Use those to log in.

## Production Build (without Docker)

```bash
npm run build
npm run start
```

The production server listens on port 3000. Set `NEXT_PUBLIC_API_URL` before building — it is inlined at build time.

```bash
NEXT_PUBLIC_API_URL=https://vault.example.com npm run build
npm run start
```

## Docker Deployment

A multi-stage Dockerfile is included.

### Build the image

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://vault.example.com \
  -t vibr8vault-ui .
```

### Run the container

```bash
docker run -d -p 3000:3000 --name vibr8vault-ui vibr8vault-ui
```

### Docker Compose example

```yaml
services:
  vibr8vault:
    image: vibr8vault:latest
    ports:
      - "8200:8200"

  vibr8vault-ui:
    build:
      context: .
      args:
        NEXT_PUBLIC_API_URL: http://vibr8vault:8200
    ports:
      - "3000:3000"
    depends_on:
      - vibr8vault
```

## Full Ubuntu Server Deployment

A step-by-step guide to deploy Vibr8Vault Web UI on a fresh Ubuntu 22.04+ server with Nginx and systemd.

### Prerequisites

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify versions
node -v   # v20.x.x
npm -v    # 10.x.x

# Install Nginx
sudo apt install -y nginx
```

### 1. Download the Vibr8Vault backend

Download the latest release binary for your architecture:

```bash
# Example — replace with actual release URL
curl -fsSL https://github.com/vibr8soft/Vibr8Vault/releases/latest/download/vibr8vault-linux-amd64 \
  -o /usr/local/bin/vibr8vault
sudo chmod +x /usr/local/bin/vibr8vault
```

### 2. Start the Vibr8Vault backend

For a quick test, use dev mode:

```bash
vibr8vault --dev
```

For production, create a config file and a systemd service. See the [backend docs](https://github.com/vibr8soft/Vibr8Vault) for details.

### 3. Clone and build the Web UI

```bash
# Clone the repository
git clone https://github.com/vibr8soft/Vibr8Vault.git /opt/vibr8vault
cd /opt/vibr8vault/web-ui

# Install dependencies
npm ci

# Build for production — set your backend URL
NEXT_PUBLIC_API_URL=https://vault.example.com npm run build
```

> **Note:** `NEXT_PUBLIC_API_URL` is inlined at build time. If you change the backend address later, you must rebuild.

### 4. Create a system user

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin vibr8vault-ui
sudo chown -R vibr8vault-ui:vibr8vault-ui /opt/vibr8vault/web-ui
```

### 5. Create a systemd service

```bash
sudo tee /etc/systemd/system/vibr8vault-ui.service > /dev/null <<'EOF'
[Unit]
Description=Vibr8Vault Web UI
After=network.target

[Service]
Type=simple
User=vibr8vault-ui
Group=vibr8vault-ui
WorkingDirectory=/opt/vibr8vault/web-ui
ExecStart=/usr/bin/node /opt/vibr8vault/web-ui/.next/standalone/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vibr8vault-ui
sudo systemctl start vibr8vault-ui

# Check status
sudo systemctl status vibr8vault-ui
```

### 6. Configure Nginx reverse proxy

```bash
sudo tee /etc/nginx/sites-available/vibr8vault-ui > /dev/null <<'EOF'
server {
    listen 80;
    server_name vault.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/vibr8vault-ui /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Enable HTTPS with Let's Encrypt (recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vault.example.com
```

Certbot automatically configures Nginx for TLS and sets up auto-renewal.

### 8. Verify

Open `https://vault.example.com` in your browser. You should see the Vibr8Vault login page.

### Updating

To update the Web UI after pulling new changes:

```bash
cd /opt/vibr8vault/web-ui
git pull
npm ci
NEXT_PUBLIC_API_URL=https://vault.example.com npm run build

# Copy standalone static assets (required after rebuild)
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

sudo systemctl restart vibr8vault-ui
```

## Environment Variables

| Variable              | Required | Default                 | Description                                            |
| --------------------- | -------- | ----------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL` | No       | `http://localhost:8200` | Vibr8Vault backend address. **Inlined at build time.** |

## Project Structure

```
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── page.tsx     # Dashboard
│   │   ├── login/       # Login page
│   │   ├── secrets/     # Secret browser + namespace detail
│   │   ├── tokens/      # Token management
│   │   ├── users/       # User management (admin)
│   │   ├── namespaces/  # Namespace management (admin)
│   │   ├── policies/    # Policy editor (admin)
│   │   └── audit/       # Audit log viewer (admin)
│   ├── components/      # React components (auth-guard, sidebar, shadcn/ui)
│   ├── hooks/           # Custom React hooks
│   └── lib/             # SDK client, auth context, utilities
├── public/              # Static assets
├── Dockerfile           # Multi-stage production build
├── .env.example         # Environment variable template
├── next.config.ts       # Next.js configuration
└── package.json
```

## Scripts

| Command         | Description                              |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Start development server with hot reload |
| `npm run build` | Create optimized production build        |
| `npm run start` | Start production server                  |

## License

MIT — see [LICENSE](LICENSE) for details.
