# Pricing Analysis Agent

A Mastra-powered AI agent for analyzing pricing, margins, and profitability in the Voltura Group sales database.

## Overview

This agent provides intelligent analysis of 736K+ sales transactions spanning May 2021 to November 2025, helping identify:

- Customers and products with negative margins (sold below cost)
- Profitability rankings by customer and product
- Executive-level KPIs and problem areas
- Pricing issues and opportunities

## Features

### 🎯 Core Capabilities

1. **Margin Analysis**
   - Identify customers/products sold below cost
   - Calculate profit margins by customer or SKU
   - Analyze margin trends over time periods

2. **Profitability Analysis**
   - Rank customers and products by profitability
   - Compare revenue vs. margin contributions
   - Track performance metrics

3. **Executive Summaries**
   - High-level KPIs (revenue, margins, customers, products)
   - Problem areas requiring immediate attention
   - Customer concentration analysis

### 📊 Phase 1 Functions (Implemented)

- ✅ `getNegativeMarginsByCustomer()` - Find unprofitable customers
- ✅ `getNegativeMarginsBySKU()` - Find products sold below cost
- ✅ `getCustomerProfitability()` - Rank customers by profitability
- ✅ `getProductPerformance()` - Analyze product performance
- ✅ `getExecutiveDashboard()` - Executive KPIs
- ✅ `getProblemAreasReport()` - Critical issues

## Project Structure

```
agent/
├── app/                                   # Next.js app directory
│   ├── api/                               # API & Mastra integration
│   │   └── src/
│   │       ├── mastra/                    # Mastra agent (Direct Integration)
│   │       │   ├── agents/
│   │       │   │   └── pricing-agent.ts           # Main pricing agent
│   │       │   ├── tools/
│   │       │   │   ├── margin-analysis-tool.ts    # Margin analysis tool
│   │       │   │   ├── customer-analysis-tool.ts  # Customer analysis tool
│   │       │   │   ├── product-analysis-tool.ts   # Product analysis tool
│   │       │   │   ├── pricing-analysis-tool.ts   # Pricing analysis tool
│   │       │   │   ├── executive-summary-tool.ts  # Executive summary tool
│   │       │   │   ├── discount-returns-tool.ts   # Discount & returns tool
│   │       │   │   ├── trends-forecasting-tool.ts # Trends forecasting tool
│   │       │   │   └── data-quality-tool.ts       # Data quality tool
│   │       │   ├── lib/
│   │       │   │   ├── database.ts                # Database connection
│   │       │   │   └── queries/                   # Query functions
│   │       │   │       ├── base-queries/          # Core query functions
│   │       │   │       ├── get-customer-profitability.ts
│   │       │   │       ├── get-product-performance.ts
│   │       │   │       ├── get-executive-dashboard.ts
│   │       │   │       ├── get-problem-areas-report.ts
│   │       │   │       └── index.ts
│   │       │   ├── examples/
│   │       │   │   ├── query-pricing-agent.ts     # Multiple example queries
│   │       │   │   └── interactive-query.ts       # Single query CLI
│   │       │   └── index.ts                       # Mastra instance
│   │       └── docs/                              # Documentation
│   │           ├── CORE_QUERY_FUNCTIONS.md        # Complete function specs
│   │           ├── QUERY_FUNCTION_REFERENCE.md    # Quick reference
│   │           └── DATABASE_ANALYSIS_SUMMARY.md   # Database analysis
│   ├── page.tsx                           # Home page
│   ├── layout.tsx                         # Root layout
│   └── globals.css                        # Global styles
├── public/                                # Static assets
├── package.json
├── tsconfig.json
├── next.config.ts
└── .env.example                           # Environment variables template
```

## Setup

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env` file in the `/agent` directory:

```bash
# Copy from example
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:

```env
OPENAI_API_KEY=sk-...your-key-here
DATABASE_PATH=../data/voltura_data_cleaned.db
```

## Usage

### Mastra Playground (Visual Interface)

Launch the interactive Mastra Playground to test your agents, workflows, and tools with a visual UI:

```bash
pnpm playground
```

This will start the Mastra development server and you can access the playground at:

- **Playground UI**: `http://localhost:4111/`
- **Agent Chat**: `http://localhost:4111/agents`
- **Workflows**: `http://localhost:4111/workflows`
- **Tools**: `http://localhost:4111/tools`
- **Swagger API**: `http://localhost:4111/swagger-ui`

The playground provides:

- 🗨️ Interactive chat interface for testing agents
- 🔍 Real-time traces and debugging
- ⚙️ Model settings configuration
- 📊 Agent evaluation metrics
- 🛠️ Tool testing in isolation

### Interactive Query (CLI)

Ask any question about pricing and profitability from the command line:

```bash
pnpm query "Show me customers with negative margins"
```

```bash
pnpm query "What are our top 10 products by revenue for 2024?"
```

```bash
pnpm query "Give me an executive dashboard for Q1 2024"
```

### Example Queries Script

Run multiple pre-defined example queries:

```bash
pnpm examples
```

This will run 6 example queries demonstrating the agent's capabilities.

### Programmatic Usage

```typescript
import { pricingAgent } from './src/mastra';

const response = await pricingAgent.generate(
  'Which customers are we losing money on?'
);

console.log(response.text);
```

## Example Questions

### Margin Analysis

- "Show me customers with negative margins for 2024"
- "Which products are we selling below cost?"
- "Find SKUs with negative margins in Q1"
- "What customers are losing us money?"

### Profitability

- "Who are our top 20 most profitable customers?"
- "Show me the best performing products by margin"
- "Rank customers by total revenue for last 6 months"
- "What are our worst performing products?"

### Executive Summaries

- "Give me an executive dashboard for 2024"
- "Show me a summary of Q2 performance"
- "What are the biggest problems right now?"
- "What needs immediate attention?"

### Specific Analysis

- "Analyze customer ABC-123 profitability"
- "Show me product IEZ51697949 performance"
- "Compare Q1 2024 vs Q1 2023"

## Database Information

- **Database**: `voltura_data_cleaned.db`
- **Location**: `../data/voltura_data_cleaned.db`
- **Records**: 736,391 transactions
- **Date Range**: 2021-05-14 to 2025-11-21
- **Customers**: 2,076
- **Products**: 1,053 (982 with cost data)

### Data Quality Features

- ✅ Cleaned and standardized customer names
- ✅ Corrected quantities and prices
- ✅ Document type classification (Invoice vs Credit Note)
- ✅ Transaction flags (returns, rebates, samples)
- ✅ Duplicate removal

## Tools

### 1. Margin Analysis Tool

Identifies negative margins by customer or product.

**Input:**

- `groupBy`: 'customer' or 'sku'
- `startDate`, `endDate`: Optional date range (YYYY-MM-DD)
- `onlyNegative`: Show only negative margins (default: true)
- `minTransactions`: For SKU analysis (default: 5)

**Output:** List of customers/products with revenue, cost, margin data

### 2. Profitability Tool

Analyzes profitability and performance metrics.

**Input:**

- `analyzeBy`: 'customer' or 'product'
- `startDate`, `endDate`: Optional date range
- `sortBy`: 'margin', 'revenue', 'margin_percent', 'quantity'
- `limit`: Max results (default: 20)

**Output:** Ranked list with profitability metrics

### 3. Executive Summary Tool

Provides dashboard KPIs or problem areas report.

**Input:**

- `reportType`: 'dashboard' or 'problems'
- `startDate`, `endDate`: Optional date range

**Output:**

- Dashboard: High-level KPIs
- Problems: Lists of issues requiring attention

## Development

### Available Scripts

- `pnpm playground` - Start the Mastra playground UI (<http://localhost:4111/>)
- `pnpm query "<question>"` - Ask a single question to the agent
- `pnpm examples` - Run multiple example queries
- `pnpm dev` - Run the example queries script
- `pnpm typecheck` - Check TypeScript types
- `pnpm build` - Build the project

### Type Checking

```bash
pnpm typecheck
```

### Build

```bash
pnpm build
```

## Roadmap

### Phase 2 (Next)

- Discount impact analysis
- Pricing variance detection
- Customer lifetime value
- Return analysis
- Sales trends

### Phase 3

- Cross-sell opportunities
- Seasonality analysis
- Product mix optimization
- Price elasticity
- Breakeven analysis

### Phase 4

- Revenue forecasting
- Customer churn prediction
- Anomaly detection

See `CORE_QUERY_FUNCTIONS.md` for complete specifications of all 48 planned functions.

## Documentation

- **[CORE_QUERY_FUNCTIONS.md](./CORE_QUERY_FUNCTIONS.md)** - Complete specifications of 48 query functions
- **[QUERY_FUNCTION_REFERENCE.md](./QUERY_FUNCTION_REFERENCE.md)** - Quick reference and use case mapping
- **[DATABASE_ANALYSIS_SUMMARY.md](./DATABASE_ANALYSIS_SUMMARY.md)** - Database analysis and insights

## Troubleshooting

### "Database not found" error

Ensure the database path in `.env` points to the correct location:

```env
DATABASE_PATH=../data/voltura_data_cleaned.db
```

### "OpenAI API key not found" error

Make sure your `.env` file contains a valid OpenAI API key:

```env
OPENAI_API_KEY=sk-...
```

### TypeScript errors

Run type checking to identify issues:

```bash
pnpm typecheck
```

## License

ISC
