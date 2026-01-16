# rmtrack
A web app that allows you to track one Royal Mail tracking ID and get updates as a notification in your browser as it goes through the Royal Mail network.

Deployed on **Cloudflare Pages** with **Cloudflare Workers** backend and **D1 database** for data persistence.

## Features

- ✅ Track Royal Mail packages using tracking ID
- ✅ Automatic tracking ID validation (format: AB123456789GB)
- ✅ Browser notifications for status updates
- ✅ Periodic checking every 15 minutes
- ✅ Automatic stop after delivery
- ✅ Tracking history
- ✅ Cloudflare Workers API backend
- ✅ D1 SQLite database for data persistence
- ✅ Automatic deployment via GitHub Actions

## Usage

1. Visit the deployed app or run locally
2. Enter your Royal Mail tracking ID (format: 2 letters + 9 digits + 2 letters, e.g., AB123456789GB)
3. Optionally enable browser notifications to get alerts when status changes
4. Click "Start Tracking"
5. The app will check for updates every 15 minutes via the API
6. Once your package is delivered, tracking stops automatically

## Tracking ID Format

Royal Mail tracking IDs follow this format:
- 2 letters (e.g., AB)
- 9 digits (e.g., 123456789)
- 2 letters (e.g., GB)

Example: `AB123456789GB`

## Architecture

### Frontend (Cloudflare Pages)
- Single-page application with vanilla JavaScript
- Browser notifications via Web Notifications API
- Service Worker for background updates and caching
- Local session persistence for continuity

### Backend (Cloudflare Workers)
- RESTful API endpoints for tracking operations
- D1 SQLite database for persistent storage
- Automatic status checking via API
- Mock Royal Mail API integration (ready for production API)

### Deployment
- GitHub Actions automatically deploys to Cloudflare Pages
- Database migrations can be run via Wrangler CLI

## How It Works

1. **Validation**: The app validates your tracking ID format before starting
2. **API Storage**: Tracking data is stored in Cloudflare D1 database
3. **Periodic Checks**: Every 15 minutes, the frontend calls the API to check status
4. **Notifications**: If enabled and the status changes, you'll receive a browser notification
5. **Auto-Stop**: Once the package is marked as delivered, checking stops automatically

## Browser Compatibility

This app works in modern browsers that support:
- Web Notifications API
- Service Workers
- LocalStorage
- ES6 JavaScript

Tested on:
- Chrome/Edge (recommended)
- Firefox
- Safari

## Privacy

Tracking data is stored securely in Cloudflare D1 database. The app only stores tracking IDs and status information. No personal information is collected.

## Development

### Local Development

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Create D1 database:
```bash
wrangler d1 create rmtrack-db
```

3. Update `wrangler.toml` with your database ID

4. Run migrations:
```bash
wrangler d1 execute rmtrack-db --file=migrations/0001_initial_schema.sql
```

5. Run locally:
```bash
wrangler pages dev public --d1 DB=rmtrack-db
```

### Project Structure

```
rmtrack/
├── public/                  # Static frontend files
│   ├── index.html          # Main HTML structure
│   ├── styles.css          # Styling and layout
│   ├── app.js              # Frontend application logic
│   └── service-worker.js   # Service worker for notifications
├── functions/              # Cloudflare Workers functions
│   └── api/
│       └── [[path]].js     # API routes handler
├── migrations/             # D1 database migrations
│   └── 0001_initial_schema.sql
├── wrangler.toml           # Cloudflare configuration
└── .github/workflows/      # GitHub Actions
    └── deploy.yml          # Deployment workflow
```

## Deployment Setup

### Prerequisites

1. Cloudflare account
2. GitHub repository
3. Cloudflare API token with Pages and D1 permissions

### Setup Steps

1. **Create Cloudflare Pages project:**
   - Go to Cloudflare Dashboard → Pages
   - Create a new project named `rmtrack`

2. **Create D1 database:**
```bash
wrangler d1 create rmtrack-db
```

3. **Add GitHub Secrets:**
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

4. **Update wrangler.toml** with your database ID

5. **Run database migrations:**
```bash
wrangler d1 execute rmtrack-db --file=migrations/0001_initial_schema.sql --remote
```

6. **Push to GitHub** - automatic deployment via Actions

### API Endpoints

- `POST /api/tracking` - Add new tracking ID
- `GET /api/tracking/:id` - Get tracking information
- `POST /api/tracking/:id/check` - Check for status updates
- `DELETE /api/tracking/:id` - Stop tracking
- `GET /api/health` - Health check

## License

MIT License - see LICENSE file for details
