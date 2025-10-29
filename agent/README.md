# EY Hackathon - AI Agent Frontend

This is a [Next.js](https://nextjs.org) project with integrated [Mastra](https://mastra.ai) AI agent for pricing and profitability analysis.

## 🏗️ Architecture - Direct Integration

This project uses **Mastra Direct Integration** - the Mastra agent is embedded directly within the Next.js application, perfect for prototypes and smaller applications.

```
agent/
├── app/                                   # Next.js app directory
│   ├── api/                               # API & Mastra integration
│   │   └── src/
│   │       └── mastra/                    # Mastra agent (Direct Integration)
│   │           ├── agents/                # AI agent definitions
│   │           ├── tools/                 # Agent tools (8 tools)
│   │           ├── lib/                   # Database & queries
│   │           ├── examples/              # Example usage scripts
│   │           └── index.ts               # Mastra instance
│   ├── page.tsx                           # Frontend pages
│   └── ...
├── package.json                           # Unified dependencies
└── tsconfig.json                          # TypeScript config
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended)
- SQLite database at `../data/voltura_data_cleaned.db`

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Azure OpenAI credentials
```

### Environment Variables

Create a `.env` file in the root:

```env
# Azure OpenAI Configuration (Required)
AZURE_OPENAI_API_KEY=your-azure-openai-api-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-5
AZURE_OPENAI_API_VERSION=2024-08-01-preview

# Database Configuration (Optional - auto-detected)
DATABASE_PATH=/Users/Sharan.Umavassee/Source/ey-hackathon/data/voltura_data_cleaned.db

# Memory Storage (Optional - defaults to :memory:)
LIBSQL_URL=:memory:
```

**📖 See [ENV_SETUP.md](./ENV_SETUP.md) for detailed setup instructions**

## 📦 Available Scripts

### Frontend (Next.js)

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

### Agent (Mastra)

```bash
# Run example queries against the agent
pnpm agent:dev

# Interactive query mode
pnpm agent:query

# Open Mastra playground
pnpm agent:playground

# Type checking
pnpm typecheck
```

## 🤖 Mastra Agent Integration

The pricing analysis agent is integrated directly into the Next.js app:

```typescript
// In your Next.js API route or server component
import { mastra } from "@/mastra";

export async function GET() {
  const agent = mastra.getAgent("pricingAgent");
  const result = await agent.generate("Show me customers with negative margins");
  return Response.json(result);
}
```

### Agent Capabilities

The pricing agent has 8 specialized tools:

1. **margin-analysis** - Comprehensive margin analysis with flexible filtering
2. **executive-summary** - Dashboard KPIs and problem areas
3. **pricing-analysis** - Pricing variance and compliance analysis
4. **customer-analysis** - Customer segmentation and profitability
5. **product-analysis** - Product performance and inventory
6. **discount-returns** - Discount effectiveness and returns
7. **trends-forecasting** - Sales trends and forecasting
8. **data-quality** - Data quality assessment

## 📚 Documentation

Detailed documentation is available in `app/api/src/docs/`:

- **CORE_QUERY_FUNCTIONS.md** - Complete function specifications
- **QUERY_FUNCTION_REFERENCE.md** - Quick reference guide
- **DATABASE_ANALYSIS_SUMMARY.md** - Database analysis
- **IMPLEMENTATION_SUMMARY.md** - Implementation details
- **AGENT_BASE_QUERY_ACCESS.md** - Agent query access patterns

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS
- **AI Agent**: Mastra, Azure OpenAI
- **Database**: SQLite (via better-sqlite3)
- **Language**: TypeScript
- **Package Manager**: pnpm

## 📝 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Mastra Documentation](https://docs.mastra.ai)
- [Agent README](./README-AGENT.md) - Detailed agent documentation

## 🔗 Integration Pattern

This project follows the **Direct Integration** pattern where Mastra runs in the same process as Next.js:

**Pros:**

- Simple deployment (single application)
- Shared dependencies
- Easy development
- Perfect for MVPs and prototypes

**Cons:**

- Agent and frontend scale together
- Longer build times
- Mixed concerns

For production apps requiring independent scaling, consider separating the agent into its own service.
