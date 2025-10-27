# Query Function Quick Reference Guide

This document maps common business questions to the appropriate query functions from `CORE_QUERY_FUNCTIONS.md`.

---

## 💰 Profitability & Margin Questions

| Business Question | Query Function | Category |
|-------------------|----------------|----------|
| "Which customers are losing us money?" | `getNegativeMarginsByCustomer()` | Margin Analysis |
| "Which products are we selling below cost?" | `getNegativeMarginsBySKU()` | Margin Analysis |
| "What's our overall margin percentage?" | `getExecutiveDashboard()` | Executive Summary |
| "How have our margins changed over time?" | `getMarginTrend()` | Margin Analysis |
| "Which customer-product combinations are unprofitable?" | `getCustomerProductMarginMatrix()` | Margin Analysis |
| "How does each customer contribute to overall margin?" | `getCustomerMarginContribution()` | Advanced Metrics |
| "What price do we need to break even?" | `getBreakevenAnalysis()` | Advanced Metrics |
| "Show me the flow from gross to net revenue" | `getWaterfallAnalysis()` | Advanced Metrics |

---

## 💵 Pricing Questions

| Business Question | Query Function | Category |
|-------------------|----------------|----------|
| "Are we following our catalogue prices?" | `getPriceVarianceAnalysis()` | Pricing Analysis |
| "Are we pricing the same product differently to the same customer?" | `getPriceConsistencyByCustomer()` | Pricing Analysis |
| "Which price tiers are we actually using?" | `getPriceTierUsage()` | Pricing Analysis |
| "How do our prices compare across customers?" | `getCompetitivePricePosition()` | Pricing Analysis |
| "Is discounting helping or hurting us?" | `getDiscountImpactAnalysis()` | Discount Analysis |
| "Which transactions have suspiciously high discounts?" | `getHighDiscountAlerts()` | Discount Analysis |
| "How compliant are we with catalogue pricing?" | `getCatalogueCompliance()` | Catalogue Analysis |
| "How sensitive is demand to price changes?" | `getPriceElasticity()` | Advanced Metrics |
| "Which price tier generates the most profit?" | `getPriceTierPerformance()` | Catalogue Analysis |

---

## 👥 Customer Questions

| Business Question | Query Function | Category |
|-------------------|----------------|----------|
| "Who are our most profitable customers?" | `getCustomerProfitability()` | Customer Analysis |
| "What's the lifetime value of our customers?" | `getCustomerLifetimeValue()` | Customer Analysis |
| "How should we segment our customer base?" | `getCustomerSegmentation()` | Customer Analysis |
| "Which customers are at risk of leaving?" | `getCustomerChurnRisk()` | Customer Analysis |
| "Are we too dependent on a few large customers?" | `getCustomerConcentrationRisk()` | Customer Analysis |
| "Which customers get the most samples/promos?" | `getSampleAndPromoImpact()` | Discount Analysis |
| "Predict future value from each customer" | `getCustomerLifetimeValuePrediction()` | Forecasting |

---

## 📦 Product Questions

| Business Question | Query Function | Category |
|-------------------|----------------|----------|
| "What are our best-performing products?" | `getProductPerformance()` | Product Analysis |
| "Which products aren't selling?" | `getSlowMovingProducts()` | Product Analysis |
| "Are some products competing with each other?" | `getProductCannibalisation()` | Product Analysis |
| "What's our product mix contribution?" | `getProductMixAnalysis()` | Product Analysis |
| "Which products are bought together?" | `getCrossSellOpportunities()` | Product Analysis |
| "Which products are in catalogue but never sold?" | `getOrphanedProducts()` | Catalogue Analysis |

---

## 🔄 Returns & Credits Questions

| Business Question | Query Function | Category |
|-------------------|----------------|----------|
| "What's our return rate by customer/product?" | `getReturnAnalysis()` | Return Analysis |
| "How much are we giving back in rebates?" | `getRebateAnalysis()` | Return Analysis |
| "What's the total impact of credit notes?" | `getCreditNoteImpact()` | Return Analysis |

---

## 📈 Trend & Time-Based Questions

| Business Question | Query Function | Category |
|-------------------|----------------|----------|
| "How are sales trending over time?" | `getSalesTrend()` | Trend Analysis |
| "Is there seasonality in our business?" | `getSeasonalityAnalysis()` | Trend Analysis |
| "How do we compare to last year/quarter?" | `getGrowthAnalysis()` | Trend Analysis |
| "What will revenue be next quarter?" | `getRevenueForecast()` | Forecasting |

---

## 💡 Strategy & Optimization Questions

| Business Question | Query Function | Category |
|-------------------|----------------|----------|
| "Are discounts driving volume or killing margin?" | `getDiscountEffectiveness()` | Discount Analysis |
| "Are we optimizing for pallet quantities?" | `getPalletOptimization()` | Logistics |
| "How efficient are our orders?" | `getOrderEfficiency()` | Logistics |
| "What's the contribution margin by segment?" | `getContributionMarginBySegment()` | Advanced Metrics |

---

## 📊 Executive & Summary Questions

| Business Question | Query Function | Category |
|-------------------|----------------|----------|
| "Give me a high-level overview" | `getExecutiveDashboard()` | Executive Summary |
| "What are the biggest problems right now?" | `getProblemAreasReport()` | Executive Summary |
| "Are there any data quality issues?" | `getDataQualityReport()` | Data Quality |
| "Find unusual transactions" | `getAnomalousTransactions()` | Data Quality |

---

## 🎯 Common Use Cases & Query Combinations

### Use Case 1: "Why are our margins declining?"

**Sequence:**

1. `getMarginTrend()` - Identify the decline pattern
2. `getNegativeMarginsByCustomer()` - Find problematic customers
3. `getNegativeMarginsBySKU()` - Find problematic products
4. `getDiscountImpactAnalysis()` - Check if discounting increased
5. `getReturnAnalysis()` - Check if returns increased

### Use Case 2: "Should we continue working with Customer X?"

**Sequence:**

1. `getCustomerProfitability()` - Overall profitability
2. `getCustomerProductMarginMatrix(customerCode: 'X')` - Which products are profitable
3. `getReturnAnalysis(groupBy: 'customer')` - Return rate
4. `getCustomerLifetimeValue(customerCode: 'X')` - Long-term value
5. `getPriceConsistencyByCustomer(customerCode: 'X')` - Pricing issues

### Use Case 3: "Optimize Product Portfolio"

**Sequence:**

1. `getProductPerformance()` - Overall performance
2. `getProductMixAnalysis()` - ABC classification
3. `getSlowMovingProducts()` - Identify dead stock
4. `getCrossSellOpportunities()` - Bundle opportunities
5. `getProductCannibalisation()` - Internal competition

### Use Case 4: "Pricing Strategy Review"

**Sequence:**

1. `getPriceVarianceAnalysis()` - Are we following catalogue?
2. `getCatalogueCompliance()` - Compliance rate
3. `getPriceTierPerformance()` - Which tiers work best
4. `getPriceElasticity()` - How sensitive is demand
5. `getBreakevenAnalysis()` - Minimum viable pricing

### Use Case 5: "Customer Retention Strategy"

**Sequence:**

1. `getCustomerSegmentation()` - Understand segments
2. `getCustomerChurnRisk()` - Who's at risk
3. `getCustomerLifetimeValue()` - Who's most valuable
4. `getCustomerConcentrationRisk()` - Dependency risk
5. `getCustomerLifetimeValuePrediction()` - Future value

### Use Case 6: "Discount Policy Effectiveness"

**Sequence:**

1. `getDiscountImpactAnalysis()` - Overall impact
2. `getDiscountEffectiveness()` - Volume vs margin trade-off
3. `getHighDiscountAlerts()` - Outliers/errors
4. `getMarginAnalysisByDimension(groupBy: 'customer')` - Who gets discounts
5. `getPriceConsistencyByCustomer()` - Fair treatment

---

## 🔧 Implementation Priority

### Phase 1 - Critical (Implement First)

Essential for identifying and fixing immediate problems:

- ✅ `getNegativeMarginsByCustomer()`
- ✅ `getNegativeMarginsBySKU()`
- ✅ `getCustomerProfitability()`
- ✅ `getProductPerformance()`
- ✅ `getExecutiveDashboard()`
- ✅ `getProblemAreasReport()`

### Phase 2 - Important (Implement Next)

Deep analysis and strategic insights:

- `getDiscountImpactAnalysis()`
- `getCustomerLifetimeValue()`
- `getMarginTrend()`
- `getPriceVarianceAnalysis()`
- `getReturnAnalysis()`
- `getSalesTrend()`
- `getCustomerSegmentation()`

### Phase 3 - Enhanced Analytics

Advanced features for optimization:

- `getCrossSellOpportunities()`
- `getSeasonalityAnalysis()`
- `getProductMixAnalysis()`
- `getPriceElasticity()`
- `getBreakevenAnalysis()`
- `getDiscountEffectiveness()`

### Phase 4 - Predictive & Advanced

Forward-looking insights:

- `getRevenueForecast()`
- `getCustomerLifetimeValuePrediction()`
- `getCustomerChurnRisk()`
- `getAnomalousTransactions()`

---

## 💬 Natural Language to Function Mapping

The Mastra agent should be able to interpret these natural language queries:

| User Says | Agent Calls |
|-----------|-------------|
| "Show me unprofitable customers" | `getNegativeMarginsByCustomer()` |
| "Which products lose money" | `getNegativeMarginsBySKU()` |
| "Customer X profitability" | `getCustomerProfitability(customerCode: 'X')` |
| "Best products by margin" | `getProductPerformance(sortBy: 'margin')` |
| "Dashboard for Q1 2024" | `getExecutiveDashboard(startDate: '2024-01-01', endDate: '2024-03-31')` |
| "What's broken?" | `getProblemAreasReport()` |
| "Margin trends" | `getMarginTrend()` |
| "Are we overcharging anyone?" | `getPriceVarianceAnalysis()` |
| "Return problems" | `getReturnAnalysis()` |
| "Who might churn?" | `getCustomerChurnRisk()` |
| "Products to discontinue" | `getSlowMovingProducts()` |
| "Bundle opportunities" | `getCrossSellOpportunities()` |

---

## 📝 Notes for Agent Design

1. **Default Behaviors:**
   - Exclude returns/samples unless specifically requested
   - Use last 12 months if no date range specified
   - Limit results to top 10/20 unless user asks for more
   - Use standardized customer names

2. **Smart Combinations:**
   - When asked about "customer problems", combine profitability + churn risk + return analysis
   - When asked about "pricing issues", combine variance + consistency + discount analysis
   - When asked about "product portfolio", combine performance + mix + slow-moving

3. **Context Awareness:**
   - Track conversation context to avoid redundant queries
   - Reference previous results when making comparisons
   - Suggest related analyses based on findings

4. **Data Quality:**
   - Always mention if data is missing (e.g., products without cost data)
   - Flag anomalies when found
   - Use corrected values by default

---

## 🚀 Getting Started

**For the agent developer:**

1. Start with the 6 critical functions in Phase 1
2. Create corresponding Mastra tools that wrap these functions
3. Test with natural language queries from the mapping table above
4. Expand to Phase 2 functions based on usage patterns

**For the business user:**

1. Start with simple queries like "Show me unprofitable customers"
2. Use the "Common Use Cases" section for multi-step analyses
3. Combine findings from multiple queries for deeper insights
4. Reference specific customers/products by code when drilling down
