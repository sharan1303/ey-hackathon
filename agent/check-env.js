// Environment check script
console.log("🔍 Checking environment variables...\n");

const requiredEnvVars = {
  AZURE_OPENAI_API_KEY: "Azure OpenAI API Key",
  AZURE_OPENAI_ENDPOINT: "Azure OpenAI Endpoint",
};

const optionalEnvVars = {
  AZURE_OPENAI_DEPLOYMENT_NAME:
    "Azure OpenAI Deployment Name (defaults to gpt-5)",
  DATABASE_PATH: "Database path (defaults to ../data/voltura_data_cleaned.db)",
  LIBSQL_URL: "LibSQL URL (defaults to :memory:)",
};

let missingRequired = false;

console.log("📋 Required environment variables:");
for (const [key, description] of Object.entries(requiredEnvVars)) {
  const value = process.env[key];
  if (value) {
    console.log(`✅ ${key}: Set (${description})`);
  } else {
    console.log(`❌ ${key}: Missing (${description})`);
    missingRequired = true;
  }
}

console.log("\n📋 Optional environment variables:");
for (const [key, description] of Object.entries(optionalEnvVars)) {
  const value = process.env[key];
  if (value) {
    console.log(`✅ ${key}: ${value}`);
  } else {
    console.log(`ℹ️  ${key}: Using default (${description})`);
  }
}

console.log("\n" + "=".repeat(60));
if (missingRequired) {
  console.log("❌ Missing required environment variables!");
  console.log("\nPlease create a .env.local file in the agent directory with:");
  console.log(`
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5
`);
  process.exit(1);
} else {
  console.log("✅ All required environment variables are set!");
}
