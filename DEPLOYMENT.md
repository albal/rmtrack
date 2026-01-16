# Deployment Guide for rmtrack on Cloudflare

This guide will help you deploy the rmtrack application to Cloudflare Pages with Workers and D1 database.

## Prerequisites

- Cloudflare account (free tier is sufficient)
- GitHub account
- Node.js and npm installed locally (for Wrangler CLI)

## Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

## Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate with Cloudflare.

## Step 3: Create D1 Database

```bash
wrangler d1 create rmtrack-db
```

This will output a database ID. **Save this ID** - you'll need it in the next step.

Example output:
```
✅ Successfully created DB 'rmtrack-db'!
[[d1_databases]]
binding = "DB"
database_name = "rmtrack-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## Step 4: Update wrangler.toml

Edit the `wrangler.toml` file and replace `preview_db_id` with your actual database ID from Step 3:

```toml
[[d1_databases]]
binding = "DB"
database_name = "rmtrack-db"
database_id = "YOUR_DATABASE_ID_HERE"  # Replace this
```

Also update the dev environment:

```toml
[[env.dev.d1_databases]]
binding = "DB"
database_name = "rmtrack-db-dev"
database_id = "YOUR_DATABASE_ID_HERE"  # Replace this
```

## Step 5: Run Database Migration

Apply the database schema:

```bash
wrangler d1 execute rmtrack-db --file=migrations/0001_initial_schema.sql --remote
```

You should see output confirming the tables were created.

## Step 6: Test Locally (Optional)

Run the application locally to test:

```bash
npm run dev
```

Or directly with Wrangler:

```bash
wrangler pages dev public --d1 DB=rmtrack-db
```

Visit `http://localhost:8788` to test the application.

## Step 7: Create Cloudflare Pages Project

### Via Dashboard:
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to Pages
3. Click "Create a project"
4. Connect to your GitHub repository
5. Configure build settings:
   - **Build command**: (leave empty)
   - **Build output directory**: `public`
6. Click "Save and Deploy"

### Via CLI:
```bash
npm run deploy
```

Or:

```bash
wrangler pages deploy public --project-name=rmtrack
```

## Step 8: Bind D1 Database to Pages

After creating the Pages project:

1. Go to your Pages project in the Cloudflare dashboard
2. Navigate to Settings → Functions
3. Under "D1 database bindings", click "Add binding"
4. Set:
   - **Variable name**: `DB`
   - **D1 database**: Select `rmtrack-db`
5. Click "Save"

## Step 9: Set up GitHub Actions (Automated Deployment)

### Get Cloudflare API Token:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to My Profile → API Tokens
3. Click "Create Token"
4. Use "Edit Cloudflare Workers" template or create custom token with:
   - Permissions:
     - Account - Cloudflare Pages - Edit
     - Account - D1 - Edit
   - Account Resources: Include your account
5. Create token and **copy it** (you won't see it again)

### Get Account ID:

1. In Cloudflare Dashboard, click on any domain
2. In the right sidebar, you'll see your Account ID
3. Copy this ID

### Add GitHub Secrets:

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add these secrets:
   - **Name**: `CLOUDFLARE_API_TOKEN`, **Value**: Your API token from above
   - **Name**: `CLOUDFLARE_ACCOUNT_ID`, **Value**: Your Account ID

## Step 10: Deploy

Push your code to the `main` branch or `copilot/add-tracking-id-notification` branch:

```bash
git push origin main
```

GitHub Actions will automatically deploy your application to Cloudflare Pages.

## Verify Deployment

1. Check GitHub Actions tab in your repository for deployment status
2. Once deployed, visit your Pages URL (shown in Cloudflare dashboard)
3. Test the application by adding a tracking ID

## Troubleshooting

### Database not found
- Ensure D1 binding is set in Pages settings
- Verify database ID in `wrangler.toml` matches your created database

### API routes not working
- Check that `functions/api/[[path]].js` exists in the correct directory
- Verify the file is included in the deployment

### GitHub Actions failing
- Verify secrets are correctly set in GitHub
- Check that the project name in `deploy.yml` matches your Pages project

### Local development issues
- Make sure you're using the latest Wrangler version
- Check that D1 database exists locally: `wrangler d1 list`

## Updating the Database Schema

If you need to add new migrations:

1. Create a new SQL file in `migrations/` directory
2. Run the migration:
   ```bash
   wrangler d1 execute rmtrack-db --file=migrations/XXXX_migration.sql --remote
   ```

## Environment Variables

Currently, the app uses mock data. To integrate with real Royal Mail API:

1. Add API credentials as environment variables in Cloudflare Pages settings
2. Update `functions/api/[[path]].js` to use real API in `fetchRoyalMailStatus()`

## Monitoring

- View logs: Cloudflare Dashboard → Pages → Your project → Logs
- View D1 data: `wrangler d1 execute rmtrack-db --command="SELECT * FROM tracking"`

## Cost

- Cloudflare Pages: Free tier includes 500 builds/month
- Cloudflare Workers: Free tier includes 100,000 requests/day
- D1 Database: Free tier includes 100,000 reads/day and 50,000 writes/day

This should be sufficient for personal use or small-scale deployment.

## Support

For issues with:
- Cloudflare setup: [Cloudflare Community](https://community.cloudflare.com/)
- Application bugs: Create an issue in the GitHub repository
