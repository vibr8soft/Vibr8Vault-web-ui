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
