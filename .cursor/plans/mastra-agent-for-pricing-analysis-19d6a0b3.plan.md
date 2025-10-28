<!-- 19d6a0b3-dfc4-4907-b7ad-0439ca9af073 f2ac0156-22af-4b73-a3da-fbdac93c6759 -->
# Mastra Agent for Pricing Analysis

## Overview

Create a Mastra-powered agent that queries the cleaned SQLite database to answer financial questions about margins, pricing, and profitability. The agent will have custom tools to analyze negative margins by customer, SKU, and time period.

## Implementation Steps

### 1. Initialize Mastra Project Structure

- Run `pnpm create mastra@latest -y --no-example` in the `/app` directory to scaffold the Mastra project without example code
- Review the generated folder structure (likely includes `/src/mastra`, `/tools`, `/agents`)
- Install additional dependencies: `better-sqlite3` and its types for database access
- Configure pnpm workspace if needed to link with parent `/data` package

### 2. Create Database Query Functions

Create `/app/src/lib/database.ts` with:

- Database connection utility pointing to `/data/voltura_data_cleaned.db`
- Core query functions (see `/app/CORE_QUERY_FUNCTIONS.md` for complete specifications):
  - `getNegativeMarginsByCustomer(startDate?, endDate?)` - Calculate margins per customer where selling price < cost
  - `getNegativeMarginsBySKU(startDate?, endDate?)` - Calculate margins per product
  - `getMarginAnalysis(groupBy, startDate?, endDate?)` - Flexible margin analysis by any dimension
  - `getDiscountImpactAnalysis(startDate?, endDate?)` - Analyze discount effects on profitability

**Reference Documents:**

- `/app/CORE_QUERY_FUNCTIONS.md` - Full specification of 48 query functions across 13 categories
- `/app/QUERY_FUNCTION_REFERENCE.md` - Quick reference mapping business questions to functions

Margin calculation: `(line_total - (quantity_corrected * landed_cost_euro))` joined from sales + landed_costs tables

### 3. Create Mastra Tools

Create `/app/src/tools/margin-analysis-tool.ts`:

- Use `createTool()` from `@mastra/core/tools`
- Tool: `marginAnalysisTool`
  - Input schema (Zod): `groupBy` (customer|sku|all), `startDate`, `endDate`, `onlyNegative` (boolean)
  - Output schema: Array of records with item/customer, revenue, cost, margin amount, margin %
  - Execute function calls database query functions

Create `/app/src/tools/discount-impact-tool.ts`:

- Tool: `discountImpactTool`
  - Input schema: `startDate`, `endDate`, `minimumDiscount`
  - Output: Total discounts given, revenue lost, items with highest discount rates
  - Helps understand if discounting is destroying profitability

### 4. Create Pricing Agent

Create `/app/src/agents/pricing-agent.ts`:

- Use `Agent` class from `@mastra/core/agent`
- Configuration:
  - Name: "Pricing Analysis Agent"
  - Model: OpenAI GPT-4 (or specified model)
  - Instructions: System prompt explaining the agent's role in analyzing pricing, margins, and profitability with specific focus on negative margin identification
  - Tools: `{ marginAnalysisTool, discountImpactTool }`

### 5. Initialize Mastra Instance

Create or update `/app/src/mastra/index.ts`:

- Import `Mastra` from `@mastra/core`
- Import pricing agent
- Initialize with:
```typescript
new Mastra({
  agents: { pricingAgent }
})
```


### 6. Create Example Queries

Create `/app/src/examples/query-agent.ts`:

- Example queries demonstrating agent capabilities:
  - "What are the top 10 customers with the largest negative margins for 2024-01 to 2024-06?"
  - "Which SKUs are consistently sold below cost?"
  - "Show me the discount impact on profitability for Q1 2024"
  - "Analyze margin performance by customer and highlight problem areas"

### 7. Setup Environment & Configuration

- Create `/app/.env` with necessary API keys (OPENAI_API_KEY)
- Update `/app/tsconfig.json` to ensure proper path resolution to database
- Add database path configuration that points to `../data/voltura_data_cleaned.db`

## Key Technical Decisions

**Database Path**: Use relative path from app directory to `/data/voltura_data_cleaned.db`

**Margin Calculation**:

```sql
SELECT 
  customer_code,
  customer_name,
  SUM(s.line_total) as total_revenue,
  SUM(s.quantity * lc.landed_cost_euro) as total_cost,
  SUM(s.line_total - (s.quantity * lc.landed_cost_euro)) as total_margin,
  (SUM(s.line_total - (s.quantity * lc.landed_cost_euro)) / SUM(s.quantity * lc.landed_cost_euro)) * 100 as margin_percent
FROM sales s
JOIN landed_costs lc ON s.item_code = lc.item_code
WHERE s.invoice_date BETWEEN ? AND ?
GROUP BY customer_code, customer_name
HAVING total_margin < 0
ORDER BY total_margin ASC
```

**Date Filtering**: Accept ISO date strings (YYYY-MM-DD) and use SQLite date comparison

**Tool Design**: Keep tools focused and single-purpose rather than one massive query tool

### To-dos

- [ ] Initialize Mastra project in /app directory using `pnpm create mastra@latest -y --no-example`
- [ ] Install dependencies: better-sqlite3, @types/better-sqlite3, zod
- [ ] Create database connection utilities in /app/src/lib/database.ts
- [ ] Set up environment variables (.env with OPENAI_API_KEY)
- [ ] Implement `getNegativeMarginsByCustomer()` in database.ts
- [ ] Implement `getNegativeMarginsBySKU()` in database.ts
- [ ] Implement `getCustomerProfitability()` in database.ts
- [ ] Implement `getProductPerformance()` in database.ts
- [ ] Implement `getDiscountImpactAnalysis()` in database.ts
- [ ] Implement `getExecutiveDashboard()` in database.ts
- [ ] Implement `getProblemAreasReport()` in database.ts
- [ ] Create margin analysis tool with Zod schemas (marginAnalysisTool)
- [ ] Create customer analysis tool (customerAnalysisTool)
- [ ] Create product analysis tool (productAnalysisTool)
- [ ] Create pricing analysis tool (pricingAnalysisTool)
- [ ] Create executive summary tool (executiveSummaryTool)
- [ ] Create financial analysis agent with comprehensive system instructions
- [ ] Initialize Mastra instance with agent and tools configuration
- [ ] Test agent with simple queries
- [ ] Create example query scripts demonstrating all agent capabilities
- [ ] Test with complex multi-step queries
- [ ] Document agent usage and best practices
- [ ] Add error handling and edge case coverage
- [ ] Implement additional query functions from CORE_QUERY_FUNCTIONS.md as needed
- [ ] Add forecasting and predictive analytics tools
- [ ] Create data quality monitoring tools
- [ ] Add export capabilities for reports