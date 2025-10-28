<!-- 643da394-4478-4ba0-8f13-f7356b8afbee 5816f040-444c-4544-8d35-17656be13ded -->
# Refactor to Scenario-Based Tools

## Overview

Replace the generic `data-query-tool` with 6 new category-based tools that provide focused, intelligent analysis. Keep existing `executive-summary-tool` and `margin-analysis-tool`. Total: 8 tools covering all 13 functional categories.

## Current State

**Existing Tools (Keep):**

- `executive-summary-tool.ts` - Executive dashboard and problem areas (Category 12)
- `margin-analysis-tool.ts` - Margin and profitability analysis (Category 1)

**To Remove:**

- `data-query-tool.ts` - Too generic, returns overwhelming raw data

## New Tools to Create

### 1. Pricing Analysis Tool

**File:** `app/src/tools/pricing-analysis-tool.ts`

**Categories:** Pricing Analysis (2) + Price Tier & Catalogue (9)

**Query Functions:**

- `getPriceVarianceAnalysis` - Compare actual vs catalogue prices
- `getDiscountImpactAnalysis` - Financial impact of discounts
- `getPriceConsistencyByCustomer` - Pricing inconsistencies
- `getCatalogueCompliance` - Catalogue price adherence

**Parameters:**

- `analysisType`: 'variance' | 'consistency' | 'catalogue_compliance' | 'tier_performance'
- `startDate`, `endDate`
- `customerCode`, `itemCode` (optional filters)
- `priceTier`: 'ie_trade' | 'ie_high' | 'ie_mid' | 'ie_low' | 'ie_base'
- `limit`: default 20

**Smart Selection:** Tool picks 1-2 relevant query functions based on `analysisType`

---

### 2. Customer Analysis Tool

**File:** `app/src/tools/customer-analysis-tool.ts`

**Category:** Customer Analysis (3)

**Query Functions:**

- `getCustomerLifetimeValue` - Customer LTV with trends
- `getCustomerSegmentation` - Revenue/margin segments
- `getCustomerChurnRisk` - Declining purchase patterns
- `getCustomerConcentrationRisk` - Revenue concentration (80/20)

**Parameters:**

- `analysisType`: 'lifetime_value' | 'segmentation' | 'churn_risk' | 'concentration'
- `startDate`, `endDate`
- `customerCode` (optional - for specific customer deep-dive)
- `inactivityDays`: default 90
- `revenueDeclineThreshold`: default 30%
- `limit`: default 20

**Smart Selection:** Based on `analysisType`, runs appropriate function(s)

---

### 3. Product Analysis Tool

**File:** `app/src/tools/product-analysis-tool.ts`

**Category:** Product Analysis (4)

**Query Functions:**

- `getSlowMovingProducts` - Low sales velocity
- `getProductMixAnalysis` - ABC classification
- `getCrossSellOpportunities` - Products bought together
- `getProductCannibalisation` - Competing products

**Parameters:**

- `analysisType`: 'slow_moving' | 'product_mix' | 'cross_sell' | 'cannibalization'
- `startDate`, `endDate`
- `itemCode` (optional filter)
- `maxTransactionsPerMonth`: default 2 (for slow-moving)
- `minCoOccurrence`: default 5 (for cross-sell)
- `limit`: default 20

**Smart Selection:** Selects appropriate query based on `analysisType`

---

### 4. Discount & Returns Tool

**File:** `app/src/tools/discount-returns-tool.ts`

**Categories:** Discount & Promotion (7) + Return & Credit (5)

**Query Functions:**

- `getDiscountEffectiveness` - Volume vs margin impact
- `getHighDiscountAlerts` - Unusually high discounts
- `getReturnAnalysis` - Return patterns and impact
- `getRebateAnalysis` - Rebate impact on margins
- `getCreditNoteImpact` - Comprehensive credit note analysis

**Parameters:**

- `analysisType`: 'discount_effectiveness' | 'high_discounts' | 'returns' | 'rebates' | 'credit_notes'
- `startDate`, `endDate`
- `groupBy`: 'customer' | 'product' | 'month' (where applicable)
- `thresholdPercent`: default 20 (for high discounts)
- `limit`: default 20

**Smart Selection:** Picks 1-2 functions based on `analysisType`

---

### 5. Trends & Forecasting Tool

**File:** `app/src/tools/trends-forecasting-tool.ts`

**Categories:** Time-based Trends (6) + Forecasting & Predictive (13)

**Query Functions:**

- `getSalesTrend` - Sales performance over time
- `getSeasonalityAnalysis` - Seasonal patterns
- `getGrowthAnalysis` - Period-over-period growth
- `getRevenueForecast` - Future revenue projection
- `getMarginTrend` - Margin performance over time

**Parameters:**

- `analysisType`: 'sales_trend' | 'seasonality' | 'growth' | 'forecast' | 'margin_trend'
- `groupBy`: 'day' | 'week' | 'month' | 'quarter' | 'year'
- `startDate`, `endDate`
- `comparisonType`: 'previous_period' | 'year_over_year' | 'custom'
- `forecastPeriods`: default 3
- `includeReturns`: default false

**Smart Selection:** Runs appropriate trend/forecast function

---

### 6. Data Quality Tool

**File:** `app/src/tools/data-quality-tool.ts`

**Category:** Data Quality & Anomaly Detection (11)

**Query Functions:**

- `getAnomalousTransactions` - Detect unusual transactions
- `getDataQualityReport` - Summary of data issues
- `getOrphanedProducts` - Products with missing data

**Parameters:**

- `reportType`: 'anomalies' | 'quality_summary' | 'orphaned_products'
- `startDate`, `endDate`
- `limit`: default 50 (for anomalies)

**Smart Selection:** Based on `reportType`

---

## Implementation Pattern

Each tool follows this structure:

```typescript
export const toolName = createTool({
  id: 'tool-id',
  description: `Clear description of when to use this tool...`,
  
  inputSchema: z.object({
    analysisType: z.enum([...]).describe('Type of analysis to perform'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.number().optional().default(20),
    // ... type-specific parameters
  }),
  
  outputSchema: z.union([
    // Different schemas for different analysisTypes
  ]),
  
  execute: async ({ context, mastra }) => {
    // Smart selection logic based on analysisType
    // Call 1-2 relevant query functions
    // Return focused, summarized results
  }
});
```

## Files to Update

1. Create 6 new tool files in `app/src/tools/`
2. Delete `app/src/tools/data-query-tool.ts`
3. Update `app/src/agents/pricing-agent.ts` to register new tools (remove data-query-tool)
4. Verify query functions exist in `app/src/lib/queries/index.ts`

## Success Criteria

- Agent receives focused insights, not overwhelming raw data
- Each tool intelligently selects appropriate queries
- Configurable limits (default 10-20 items)
- Tools are flexible enough to answer varied questions within their category
- Clear tool descriptions guide agent to pick the right tool

### To-dos

- [ ] Create pricing-analysis-tool.ts with smart query selection for pricing and catalogue analysis
- [ ] Create customer-analysis-tool.ts for customer lifecycle, segmentation, and churn analysis
- [ ] Create product-analysis-tool.ts for product performance, cross-sell, and slow-moving analysis
- [ ] Create discount-returns-tool.ts combining discount effectiveness and returns/credit analysis
- [ ] Create trends-forecasting-tool.ts for time-based trends and forecasting
- [ ] Create data-quality-tool.ts for anomaly detection and data quality reporting
- [ ] Verify all 48 query functions from CORE_QUERY_FUNCTIONS.md exist in queries/index.ts
- [ ] Update pricing-agent.ts to register 6 new tools and remove data-query-tool
- [ ] Delete data-query-tool.ts as it's being replaced by focused scenario tools