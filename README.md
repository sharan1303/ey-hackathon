# EY Hackathon - Voltura Group Sales Analysis

An AI-powered pricing and profitability analysis platform built for the EY Hackathon.

![Demo](./agent/public/Volt-Demo.gif)

## Overview

This project analyzes 736K+ sales transactions using AI to identify pricing issues, margin problems, and profitability opportunities. Built as a monorepo with separate data pipeline and AI agent components.

## Architecture

### AI Agent (`/agent`)

Intelligent analysis system powered by:

- **Framework**: [Mastra AI](https://mastra.ai) for agent orchestration
- **Frontend**: Next.js 16 + Ant Design X + GPT-Vis for chat and visualizations
- **Database**: ql.js for browser-based database access and better-sqlite3 for direct SQLite queries

**How the Agent Works:**

The agent uses 8 specialized tools to analyze sales data:

- **Margin Analysis** - Identifies products/customers sold below cost
- **Customer Analysis** - Ranks customers by profitability
- **Product Analysis** - Analyzes SKU performance
- **Pricing Analysis** - Detects pricing issues and opportunities
- **Executive Summary** - Generates high-level KPIs and dashboards
- **Discount/Returns** - Analyzes discount impact and return patterns
- **Trends & Forecasting** - Identifies trends and forecasts revenue
- **Data Quality** - Validates data integrity

When you ask a question, the agent:

1. Analyzes your query using GPT-5
2. Selects appropriate tools based on intent
3. Tool executes SQL queries against the SQLite database in the browser using Sql.js and calculates values like margin, revenue, trend, etc.
4. Returns structured insights with visualizations (tables and charts)

### Data Pipeline (`/data`)

Ingests CSV files and creates a SQLite database with direct schema replication:

1. **Import** - Reads CSV/Excel files and creates `voltura_data.db`
2. **Clean** - Processes and validates data to produce `voltura_data_cleaned.db`
   - Standardizes customer names
   - Corrects quantities and prices
   - Classifies document types (invoices vs credit notes)
   - Flags transactions (returns, rebates, samples)
   - Removes duplicates

## Project Structure

```text
ey-hackathon/
├── data/                          # Data pipeline
│   ├── dataset/                   # Source CSV/Excel files
│   ├── src/
│   │   ├── import-data.ts        # CSV → SQLite importer
│   │   ├── clean-data.ts         # Data cleaning & validation
│   │   ├── create-schema.ts      # Schema creation
│   │   └── schema.ts             # TypeScript schema definitions
│   ├── schema/
│   │   └── schema.sql            # Database schema
│   └── voltura_data_cleaned.db   # Cleaned production database
│
└── agent/                         # AI Agent application
    ├── app/
    │   ├── api/
    │   │   └── src/
    │   │       └── mastra/        # Mastra AI integration
    │   │           ├── agents/
    │   │           │   └── pricing-agent.ts     # Main AI agent
    │   │           ├── tools/                   # 8 analysis tools
    │   │           └── lib/
    │   │               ├── database.ts          # DB connection
    │   │               └── queries/             # Query functions
    │   ├── components/            # React components
    │   │   ├── chat-interface.tsx              # Main chat UI
    │   │   ├── data-visualizer.tsx             # Chart rendering
    │   │   └── database-loader.tsx             # Client-side DB
    │   └── page.tsx               # Home page
    └── public/
        └── voltura_data_cleaned.db             # Public DB copy
```

## Quick Start

### Data Pipeline

```bash
cd data
# Install dependencies
pnpm install

pnpm setup
# This will create the database schema, import the data, and clean the data
```

### AI Agent

```bash
cd agent
pnpm install

# Copy environment file
cp .env.example .env
# Add your AZURE to .env

# Run web application
pnpm dev
# Open http://localhost:3000

# Run Mastra playground (testing UI)
pnpm agent:playground
# Open http://localhost:4111

# Interactive CLI query
pnpm agent:query "Show me customers with negative margins"
```

## Database

SQLite database, set in the browser using Sql.js

### AI Agent

- **Framework**: Mastra AI
- **Frontend**: Next.js 16, React 19, Ant Design X
- **Visualization**: GPT-Vis, AntV
- **AI**: Azure OpenAI GPT-5
- **Database**: better-sqlite3, sql.js (browser)

## Key Features

- ✅ Real-time chat interface with AI agent
- ✅ Automatic chart and table generation
- ✅ 8 specialized analysis tools
- ✅ Browser-based SQL.js for client-side queries
- ✅ Conversation history and context management
- ✅ Streaming responses with tool call visibility

## Example Questions

- "Show me customers with negative margins in 2024"
- "What are our top 10 products by revenue?"
- "Give me an executive dashboard for Q1 2024"
- "Which SKUs are we selling below cost?"
- "Analyze discount impact on profitability"
