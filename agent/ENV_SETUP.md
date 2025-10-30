# Environment Setup Guide

## Quick Start

1. **Copy the example file:**

   ```bash
   cp .env.example .env
   ```

2. **Update `.env` with your Azure OpenAI credentials:**

## Required Configuration

### Azure OpenAI (Required)

You need an Azure OpenAI service with GPT-4/5 deployment. Get these values from the [Azure Portal](https://portal.azure.com):

```env
AZURE_OPENAI_API_KEY=your-actual-key-from-azure-portal
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-5
AZURE_OPENAI_API_VERSION=2024-08-01-preview
```

**How to get these values:**

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Azure OpenAI resource
3. Go to "Keys and Endpoint" section
4. Copy the key and endpoint
5. The deployment name is what you named your model deployment

## Optional Configuration

### Database Path

By default, the agent looks for the database at:
`/Users/Sharan.Umavassee/Source/ey-hackathon/data/voltura_data_cleaned.db`

If you want to use a different location:

```env
DATABASE_PATH=/path/to/your/voltura_data_cleaned.db
```

### Memory Storage

The agent uses in-memory storage by default. For persistent conversation memory, you can configure LibSQL/Turso:

```env
LIBSQL_URL=libsql://your-database.turso.io
LIBSQL_AUTH_TOKEN=your-turso-auth-token
```

## Verification

After setting up your `.env` file, test the configuration:

```bash
# Run the example queries
pnpm agent:dev

# Or run the interactive query tool
pnpm agent:query

# Or launch the Mastra playground
pnpm agent:playground
```

## Troubleshooting

### "Missing Azure OpenAI credentials"

- Make sure your `.env` file exists in `/Users/Sharan.Umavassee/Source/ey-hackathon/agent/`
- Verify all Azure OpenAI variables are set
- Check that your API key is valid and not expired

### "Database file not found"

- The database path is set to: `/Users/Sharan.Umavassee/Source/ey-hackathon/data/voltura_data_cleaned.db`
- Make sure this file exists
- Or set `DATABASE_PATH` in `.env` to point to the correct location

### "npm cache permission error"

If you see permission errors with npm:

```bash
sudo chown -R $(id -u):$(id -g) "$HOME/.npm"
```

## Security Notes

- **Never commit `.env` files** to version control (already in `.gitignore`)
- Keep your Azure OpenAI API keys secure
- Rotate keys regularly
- Use different keys for development and production

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZURE_OPENAI_API_KEY` | ✅ | - | Your Azure OpenAI API key |
| `AZURE_OPENAI_ENDPOINT` | ✅ | - | Your Azure OpenAI endpoint URL |
| `AZURE_OPENAI_DEPLOYMENT` | ✅ | - | Your model deployment name (e.g., gpt-5) |
| `AZURE_OPENAI_API_VERSION` | ✅ | 2024-08-01-preview | Azure OpenAI API version |
| `DATABASE_PATH` | ❌ | Auto-detected | Path to voltura_data_cleaned.db |
| `LIBSQL_URL` | ❌ | :memory: | LibSQL/Turso database URL for memory |
| `LIBSQL_AUTH_TOKEN` | ❌ | - | Auth token for LibSQL/Turso |
| `NODE_ENV` | ❌ | development | Environment mode |
