# Database Analysis Summary for Financial Analysis Agent

**Date:** October 27, 2025  
**Database:** `voltura_data_cleaned.db`

---

## Executive Summary

I've analyzed the Voltura Group database and created comprehensive documentation for building a financial analysis agent. The database contains **736,391 sales transactions** spanning from **May 2021 to November 2025**, covering **2,076 customers** and **1,053 products**.

---

## Deliverables Created

### 1. **CORE_QUERY_FUNCTIONS.md**

Comprehensive specification of **48 query functions** organized into **13 categories**:

1. **Margin & Profitability Analysis** (5 functions)
   - Identify negative margins by customer/product
   - Track margin trends over time
   - Analyze customer-product margin matrices
   - Calculate margin contributions

2. **Pricing Analysis** (5 functions)
   - Compare actual vs catalogue prices
   - Detect pricing inconsistencies
   - Analyze price tier usage
   - Measure competitive price positioning

3. **Customer Analysis** (5 functions)
   - Calculate customer profitability
   - Estimate lifetime value
   - Segment customers
   - Identify churn risk
   - Measure concentration risk

4. **Product Analysis** (5 functions)
   - Track product performance
   - Identify slow-moving inventory
   - Detect product cannibalization
   - Analyze product mix
   - Find cross-sell opportunities

5. **Return & Credit Analysis** (3 functions)
   - Analyze return patterns
   - Track rebate impact
   - Measure credit note effects

6. **Time-based Trend Analysis** (3 functions)
   - Track sales trends
   - Identify seasonality
   - Compare period-over-period growth

7. **Discount & Promotion Analysis** (3 functions)
   - Measure discount effectiveness
   - Analyze sample/promo ROI
   - Flag excessive discounts

8. **Inventory & Logistics** (2 functions)
   - Optimize pallet quantities
   - Measure order efficiency

9. **Price Tier & Catalogue Analysis** (3 functions)
   - Analyze tier performance
   - Measure catalogue compliance
   - Identify orphaned products

10. **Advanced Financial Metrics** (5 functions)
    - Calculate contribution margins
    - Perform breakeven analysis
    - Create waterfall analysis
    - Estimate price elasticity

11. **Data Quality & Anomaly Detection** (2 functions)
    - Detect anomalous transactions
    - Generate data quality reports

12. **Executive Summary** (2 functions)
    - Executive dashboard
    - Problem areas report

13. **Forecasting & Predictive** (2 functions)
    - Revenue forecasting
    - Customer LTV prediction

### 2. **QUERY_FUNCTION_REFERENCE.md**

Quick reference guide that maps:

- **Business questions** → **Appropriate query functions**
- **Common use cases** → **Query sequences**
- **Natural language queries** → **Function calls**
- **Implementation priorities** → **4 phased rollout**

---

## Database Schema Overview

### Core Tables

1. **sales** (736,391 records) - Transaction records with cleaned data
2. **catalogue_prices** (1,053 records) - Product pricing tiers
3. **landed_costs** (982 records) - Product costs
4. **customer_product_keys** (2,319 records) - Customer-product mappings
5. **pallet_sizes** (86 records) - Logistics data

### Key Data Quality Features

The cleaned database includes:

- ✅ **Document type classification** (Invoice vs Credit Note)
- ✅ **Corrected quantities and prices** (DQ issues fixed)
- ✅ **Standardized customer names** (196 variations resolved)
- ✅ **Transaction flags**: `is_return`, `is_rebate`, `is_sample`
- ✅ **Duplicate removal** from reference tables

### Date Range

- **First transaction:** 2021-05-14
- **Last transaction:** 2025-11-21
- **Duration:** 4.5+ years of historical data

---

## Key Insights from Schema Analysis

### Data Characteristics

- **673,065 invoices** (91.4%) - Regular sales
- **63,326 credit notes** (8.6%) - Returns and rebates
- **32,100 sample/promo items** - Free goods tracking
- **1,558 corrected negative quantities** - Data quality fixes

### Available Analyses

The database supports complex analyses including:

- ✅ Margin calculations (revenue - cost)
- ✅ Discount impact measurement
- ✅ Customer profitability tracking
- ✅ Product performance metrics
- ✅ Return rate analysis
- ✅ Price variance detection
- ✅ Trend analysis over 4+ years

---

## Implementation Priorities

### Phase 1: Critical Functions (Implement First)

These address immediate business needs:

1. `getNegativeMarginsByCustomer()` - Find unprofitable relationships
2. `getNegativeMarginsBySKU()` - Find products sold below cost
3. `getCustomerProfitability()` - Rank customer value
4. `getProductPerformance()` - Identify top/bottom products
5. `getExecutiveDashboard()` - High-level KPIs
6. `getProblemAreasReport()` - Priority alerts

**Impact:** Identifies immediate profit leaks and problem areas

### Phase 2: Important Functions

Strategic analysis capabilities:

- `getDiscountImpactAnalysis()` - Understand discount effects
- `getCustomerLifetimeValue()` - Long-term customer value
- `getMarginTrend()` - Track profitability over time
- `getPriceVarianceAnalysis()` - Pricing compliance
- `getReturnAnalysis()` - Return patterns
- `getSalesTrend()` - Revenue tracking

**Impact:** Provides strategic insights for decision-making

### Phase 3: Enhanced Analytics

Optimization and deep insights:

- `getCrossSellOpportunities()` - Bundle recommendations
- `getSeasonalityAnalysis()` - Seasonal patterns
- `getProductMixAnalysis()` - Portfolio optimization
- `getPriceElasticity()` - Demand sensitivity
- `getBreakevenAnalysis()` - Minimum pricing

**Impact:** Enables optimization and revenue growth

### Phase 4: Predictive & Advanced

Forward-looking capabilities:

- `getRevenueForecast()` - Future revenue prediction
- `getCustomerLifetimeValuePrediction()` - Future customer value
- `getCustomerChurnRisk()` - Proactive retention
- `getAnomalousTransactions()` - Fraud detection

**Impact:** Predictive insights for proactive management

---

## Example Use Cases

### Use Case 1: "Why are margins declining?"

**Query Sequence:**

1. `getMarginTrend()` → Identify decline pattern
2. `getNegativeMarginsByCustomer()` → Find problematic customers
3. `getNegativeMarginsBySKU()` → Find problematic products
4. `getDiscountImpactAnalysis()` → Check if discounting increased
5. `getReturnAnalysis()` → Check if returns increased

### Use Case 2: "Optimize customer relationships"

**Query Sequence:**

1. `getCustomerSegmentation()` → Understand customer segments
2. `getCustomerProfitability()` → Rank by profitability
3. `getCustomerChurnRisk()` → Identify at-risk customers
4. `getCustomerLifetimeValue()` → Prioritize retention efforts

### Use Case 3: "Fix pricing issues"

**Query Sequence:**

1. `getPriceVarianceAnalysis()` → Compare vs catalogue
2. `getCatalogueCompliance()` → Measure compliance rate
3. `getPriceConsistencyByCustomer()` → Find inconsistencies
4. `getHighDiscountAlerts()` → Flag outliers

---

## Natural Language Query Examples

The agent should handle queries like:

**Profitability:**

- "Show me unprofitable customers"
- "Which products are losing money?"
- "What's our overall margin percentage?"

**Customer:**

- "Who are our best customers?"
- "Which customers might leave?"
- "How valuable is customer X?"

**Product:**

- "What are our top products?"
- "Which products aren't selling?"
- "What products are bought together?"

**Pricing:**

- "Are we following our price list?"
- "Is discounting helping or hurting us?"
- "Show me pricing problems"

**Executive:**

- "Give me a dashboard for last quarter"
- "What needs immediate attention?"
- "How are we trending?"

---

## Technical Implementation Notes

### Database Connection

```typescript
import Database from 'better-sqlite3';
const db = new Database('/data/voltura_data_cleaned.db', { readonly: true });
```

### Key Filtering Patterns

```sql
-- Actual sales only (exclude returns, samples, rebates)
WHERE document_type = 'INV' 
  AND is_sample = 0 
  AND is_return = 0 
  AND is_rebate = 0

-- Use corrected values
SELECT quantity_corrected, unit_price_corrected

-- Standardized customer names
SELECT customer_name_standardized

-- Margin calculation
SELECT 
  s.line_total - (s.quantity_corrected * lc.landed_cost_euro) as margin
FROM sales s
JOIN landed_costs lc ON s.item_code = lc.item_code
```

### Performance Optimization

All key columns are indexed:

- `idx_sales_item_code` on sales(item_code)
- `idx_sales_customer` on sales(customer_code)
- `idx_sales_date` on sales(invoice_date)
- `idx_sales_invoice` on sales(invoice_number)

### Error Handling

- Handle NULL costs (some products lack cost data)
- Prevent division by zero in margin %
- Validate date ranges
- Return empty arrays vs throwing errors

---

## Next Steps

1. **Review** the two reference documents:
   - `CORE_QUERY_FUNCTIONS.md` - Complete specifications
   - `QUERY_FUNCTION_REFERENCE.md` - Quick reference guide

2. **Implement** Phase 1 functions (6 critical functions)

3. **Create** Mastra tools wrapping these functions

4. **Build** the agent with system prompt and tool integration

5. **Test** with natural language queries

6. **Expand** to Phase 2 functions based on usage

---

## Questions This Agent Can Answer

✅ **Profitability:** Which customers/products are unprofitable?  
✅ **Pricing:** Are we pricing correctly and consistently?  
✅ **Customer Value:** Who are our most valuable customers?  
✅ **Product Performance:** Which products drive profit?  
✅ **Trends:** How is performance changing over time?  
✅ **Returns:** What's being returned and why?  
✅ **Discounts:** Is discounting helping or hurting?  
✅ **Strategy:** Where should we focus efforts?  
✅ **Forecasting:** What does the future look like?  
✅ **Problems:** What needs immediate attention?

---

## Conclusion

The database is **well-structured and clean**, with comprehensive data covering 4.5 years of operations. The 48 query functions documented provide a complete toolkit for financial analysis, from identifying immediate problems to strategic planning and forecasting.

Start with the 6 critical Phase 1 functions to deliver immediate value, then expand based on business needs. The natural language interface will make these powerful analytics accessible to business users without SQL knowledge.

**Estimated Implementation Time:**

- Phase 1 (Critical): 2-3 days
- Phase 2 (Important): 3-4 days
- Phase 3 (Enhanced): 4-5 days
- Phase 4 (Predictive): 3-4 days

**Total:** ~2-3 weeks for complete implementation
