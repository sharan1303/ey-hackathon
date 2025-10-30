# Railway Deployment Guide

## Configuration Complete ✅

The following files have been created and configured:

1. **railway.json** - Railway deployment configuration
2. **.env.example** - Environment variables template
3. **app/api/health/route.ts** - Health check endpoint for Railway monitoring
4. **Production build verified** - Build succeeds with 92MB database file

## Next Steps: Deploy to Railway

### 1. Install Railway CLI

```bash
# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh

# npm
npm i -g @railway/cli

# After installation, verify:
railway --version
```

### 2. Login to Railway

```bash
railway login
```

This will open your browser for authentication.

### 3. Initialize Railway Project

From the `/workspace/agent` directory:

```bash
cd /workspace/agent
railway init
```

Choose one of:
- Create a new project
- Link to an existing project

### 4. Configure Environment Variables

Set your Azure OpenAI credentials:

```bash
railway variables set AZURE_RESOURCE_NAME=your-azure-resource-name
railway variables set AZURE_API_KEY=your-azure-api-key
railway variables set NODE_ENV=production
```

Or configure via Railway Dashboard:
1. Go to https://railway.app/dashboard
2. Select your project
3. Go to Variables tab
4. Add the environment variables

### 5. Deploy to Railway

```bash
railway up
```

This will:
- Upload your application code
- Install dependencies (including native compilation of better-sqlite3)
- Build the Next.js application
- Deploy to Railway's infrastructure
- Provide you with a deployment URL

### 6. Monitor Deployment

Watch the build logs:

```bash
railway logs
```

### 7. Verify Deployment

Once deployed, test the following:

1. **Health Check**
   ```bash
   curl https://your-app.railway.app/api/health
   ```

2. **Database Loading**
   - Visit your app URL
   - Open browser DevTools > Network tab
   - Verify `voltura_data_cleaned.db` (92MB) is downloaded
   - Check IndexedDB for cached database

3. **Chat Functionality**
   - Test the chat interface
   - Try asking questions like:
     - "Show me customer profitability analysis"
     - "What are the top performing products?"
     - "Give me an executive dashboard"

4. **Agent Tools**
   - Verify tools are executing correctly
   - Check streaming responses work
   - Confirm data visualization renders

## Important Configuration Details

### Build Configuration (railway.json)
- **Builder**: NIXPACKS (automatically handles native dependencies)
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `pnpm start`
- **Health Check**: `/api/health` with 300s timeout
- **Restart Policy**: ON_FAILURE with max 10 retries

### Database Handling
- 92MB SQLite database in `public/` folder
- Automatically deployed with application
- Served statically at `/voltura_data_cleaned.db`
- Cached in browser IndexedDB after first load

### Native Dependencies
- `better-sqlite3` will be compiled during Railway build
- The `pnpm.onlyBuiltDependencies` configuration ensures proper builds
- Railway's NIXPACKS builder handles native compilation automatically

## Troubleshooting

### Build Fails
- Check Railway logs: `railway logs`
- Verify environment variables are set correctly
- Ensure Azure OpenAI credentials are valid

### Database Not Loading
- Check browser console for errors
- Verify the database file exists at `/voltura_data_cleaned.db`
- Check Network tab for 404 or CORS errors

### Agent Not Responding
- Verify Azure OpenAI API key and resource name
- Check quota limits on your Azure account
- Review Railway logs for API errors

### Performance Issues
- Consider upgrading Railway plan for more resources
- Monitor memory usage in Railway dashboard
- Database caching should improve after first load

## Railway Dashboard

Access your deployment dashboard at: https://railway.app/dashboard

From there you can:
- View deployment logs
- Monitor resource usage
- Configure environment variables
- Set up custom domains
- Enable automatic deployments from Git

## Automatic Deployments (Optional)

To enable automatic deployments from Git:

1. Connect your GitHub repository in Railway dashboard
2. Select the branch to deploy from
3. Railway will automatically deploy on every push

## Custom Domain (Optional)

To add a custom domain:

1. Go to Railway dashboard
2. Select your project
3. Go to Settings > Domains
4. Add your custom domain
5. Configure DNS records as instructed

Railway provides automatic HTTPS certificates via Let's Encrypt.

## Cost Considerations

- **Starter Plan**: Should be sufficient for testing and low traffic
- **Database Size**: 92MB will be downloaded on first visit per user
- **Server Memory**: Browser-side sql.js reduces server memory needs
- **Usage-based billing**: Monitor your Railway usage dashboard

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app
