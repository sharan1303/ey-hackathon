# Core Query Functions for Financial Analysis Agent

Based on analysis of `voltura_data_cleaned.db` database structure and business requirements.

**Database Stats:**

- Sales records: 736,391 (May 2021 - Nov 2025)
- Products: 1,053 (982 with cost data)
- Customers: 2,076
- Date Range: 2021-05-14 to 2025-11-21

---

## 1. MARGIN & PROFITABILITY ANALYSIS

### 1.1 getNegativeMarginsByCustomer

**Purpose:** Identify customers with negative margins (selling below cost)

**Parameters:**

- `startDate?: string` (ISO format: YYYY-MM-DD)
- `endDate?: string`
- `includeReturns?: boolean` (default: false)

**Returns:**

```typescript
{
  customer_code: string;
  customer_name: string;
  total_revenue: number;
  total_cost: number;
  total_margin: number;
  margin_percent: number;
  transaction_count: number;
  items_sold: number;
}[]
```

**SQL Logic:**

```sql
SELECT 
  s.customer_code,
  s.customer_name_standardized as customer_name,
  SUM(s.line_total) as total_revenue,
  SUM(s.quantity_corrected * lc.landed_cost_euro) as total_cost,
  SUM(s.line_total - (s.quantity_corrected * lc.landed_cost_euro)) as total_margin,
  (SUM(s.line_total - (s.quantity_corrected * lc.landed_cost_euro)) / NULLIF(SUM(s.quantity_corrected * lc.landed_cost_euro), 0)) * 100 as margin_percent
FROM sales s
JOIN landed_costs lc ON s.item_code = lc.item_code
WHERE s.document_type = 'INV' 
  AND s.is_sample = 0
  AND s.is_return = 0
HAVING total_margin < 0
```

---

### 1.2 getNegativeMarginsBySKU

**Purpose:** Identify products consistently sold below cost

**Parameters:**

- `startDate?: string`
- `endDate?: string`
- `minTransactions?: number` (default: 5) - Only show products with multiple transactions

**Returns:**

```typescript
{
  item_code: string;
  product_description: string;
  total_quantity_sold: number;
  total_revenue: number;
  total_cost: number;
  total_margin: number;
  margin_percent: number;
  avg_selling_price: number;
  landed_cost: number;
  catalogue_price_trade: number;
  transaction_count: number;
  unique_customers: number;
}[]
```

---

### 1.3 getMarginAnalysisByDimension

**Purpose:** Flexible margin analysis grouped by any dimension

**Parameters:**

- `groupBy: 'customer' | 'product' | 'month' | 'customer_product'`
- `startDate?: string`
- `endDate?: string`
- `onlyNegative?: boolean`
- `minMarginPercent?: number`
- `maxMarginPercent?: number`

**Returns:** Varies by groupBy parameter

---

### 1.4 getMarginTrend

**Purpose:** Track margin performance over time

**Parameters:**

- `groupBy: 'month' | 'quarter' | 'year'`
- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  period: string;
  total_revenue: number;
  total_cost: number;
  gross_margin: number;
  margin_percent: number;
  transaction_count: number;
  unique_customers: number;
  unique_products: number;
}[]
```

---

### 1.5 getCustomerProductMarginMatrix

**Purpose:** Detailed margin analysis for each customer-product combination

**Parameters:**

- `customerCode?: string` (filter to specific customer)
- `itemCode?: string` (filter to specific product)
- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  customer_code: string;
  customer_name: string;
  item_code: string;
  product_description: string;
  quantity_sold: number;
  revenue: number;
  cost: number;
  margin: number;
  margin_percent: number;
  avg_unit_price: number;
  landed_cost: number;
  avg_discount_percent: number;
}[]
```

---

## 2. PRICING ANALYSIS

### 2.1 getPriceVarianceAnalysis

**Purpose:** Compare actual selling prices against catalogue prices

**Parameters:**

- `priceTier?: 'ie_trade' | 'ie_high' | 'ie_mid' | 'ie_low' | 'ie_base'` (default: 'ie_trade')
- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  item_code: string;
  product_description: string;
  catalogue_price: number;
  avg_actual_price: number;
  price_variance: number;
  variance_percent: number;
  min_price: number;
  max_price: number;
  transaction_count: number;
  total_quantity: number;
}[]
```

---

### 2.2 getDiscountImpactAnalysis

**Purpose:** Analyze the financial impact of discounts on profitability

**Parameters:**

- `startDate?: string`
- `endDate?: string`
- `minDiscountPercent?: number`
- `groupBy?: 'customer' | 'product' | 'overall'`

**Returns:**

```typescript
{
  dimension_key: string;
  dimension_name: string;
  total_revenue: number;
  total_discount_given: number;
  revenue_before_discount: number;
  avg_discount_percent: number;
  margin_without_discount: number;
  margin_with_discount: number;
  margin_impact: number;
  transaction_count: number;
}[]
```

---

### 2.3 getPriceTierUsage

**Purpose:** Analyze which catalogue price tiers are being used in actual sales

**Parameters:**

- `startDate?: string`
- `endDate?: string`
- `tolerance?: number` (default: 0.01) - Price matching tolerance

**Returns:**

```typescript
{
  item_code: string;
  tier_matched: string; // 'ie_trade', 'ie_high', etc., or 'custom'
  transaction_count: number;
  total_revenue: number;
  avg_actual_price: number;
  catalogue_price: number;
}[]
```

---

### 2.4 getPriceConsistencyByCustomer

**Purpose:** Identify pricing inconsistencies for the same product to the same customer

**Parameters:**

- `customerCode?: string`
- `startDate?: string`
- `endDate?: string`
- `minPriceVariation?: number` (default: 5%) - Minimum % variation to flag

**Returns:**

```typescript
{
  customer_code: string;
  customer_name: string;
  item_code: string;
  product_description: string;
  min_price: number;
  max_price: number;
  avg_price: number;
  price_range: number;
  variation_percent: number;
  transaction_count: number;
}[]
```

---

### 2.5 getCompetitivePricePosition

**Purpose:** Compare prices charged to different customers for same products

**Parameters:**

- `itemCode?: string`
- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  item_code: string;
  product_description: string;
  customer_count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_spread: number;
  customers_below_avg: number;
  customers_above_avg: number;
}[]
```

---

## 3. CUSTOMER ANALYSIS

### 3.1 getCustomerProfitability

**Purpose:** Rank customers by profitability

**Parameters:**

- `startDate?: string`
- `endDate?: string`
- `includeReturns?: boolean`
- `sortBy?: 'margin' | 'revenue' | 'margin_percent'`
- `limit?: number`

**Returns:**

```typescript
{
  customer_code: string;
  customer_name: string;
  total_revenue: number;
  total_cost: number;
  gross_margin: number;
  margin_percent: number;
  transaction_count: number;
  unique_products: number;
  avg_order_value: number;
  total_quantity: number;
}[]
```

---

### 3.2 getCustomerLifetimeValue

**Purpose:** Calculate customer lifetime value with trend analysis

**Parameters:**

- `customerCode?: string`
- `includeReturns?: boolean`

**Returns:**

```typescript
{
  customer_code: string;
  customer_name: string;
  first_purchase_date: string;
  last_purchase_date: string;
  customer_age_days: number;
  total_revenue: number;
  total_margin: number;
  total_transactions: number;
  avg_order_value: number;
  purchase_frequency: number; // orders per month
  estimated_annual_value: number;
}[]
```

---

### 3.3 getCustomerSegmentation

**Purpose:** Segment customers by revenue and margin contribution

**Parameters:**

- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  customer_code: string;
  customer_name: string;
  revenue: number;
  margin: number;
  revenue_segment: 'high' | 'medium' | 'low'; // based on percentile
  margin_segment: 'high' | 'medium' | 'low';
  combined_segment: string; // e.g., 'high_revenue_low_margin'
}[]
```

---

### 3.4 getCustomerChurnRisk

**Purpose:** Identify customers with declining purchase patterns

**Parameters:**

- `inactivityDays?: number` (default: 90)
- `revenueDeclineThreshold?: number` (default: 30%) - % decline to flag

**Returns:**

```typescript
{
  customer_code: string;
  customer_name: string;
  last_purchase_date: string;
  days_since_last_purchase: number;
  previous_period_revenue: number;
  current_period_revenue: number;
  revenue_decline_percent: number;
  lifetime_revenue: number;
  risk_level: 'high' | 'medium' | 'low';
}[]
```

---

### 3.5 getCustomerConcentrationRisk

**Purpose:** Analyze revenue concentration (80/20 rule)

**Parameters:**

- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  total_customers: number;
  total_revenue: number;
  top_10_customers_revenue: number;
  top_10_percent: number;
  top_20_customers_revenue: number;
  top_20_percent: number;
  concentration_index: number; // Herfindahl index
  customers_for_80_percent_revenue: number;
}
```

---

## 4. PRODUCT ANALYSIS

### 4.1 getProductPerformance

**Purpose:** Comprehensive product performance metrics

**Parameters:**

- `startDate?: string`
- `endDate?: string`
- `sortBy?: 'revenue' | 'margin' | 'quantity' | 'margin_percent'`
- `limit?: number`

**Returns:**

```typescript
{
  item_code: string;
  product_description: string;
  quantity_sold: number;
  revenue: number;
  cost: number;
  margin: number;
  margin_percent: number;
  unique_customers: number;
  transaction_count: number;
  avg_order_quantity: number;
  revenue_rank: number;
  margin_rank: number;
}[]
```

---

### 4.2 getSlowMovingProducts

**Purpose:** Identify products with low sales velocity

**Parameters:**

- `maxTransactionsPerMonth?: number` (default: 2)
- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  item_code: string;
  product_description: string;
  has_inventory_data: boolean;
  transaction_count: number;
  total_quantity_sold: number;
  avg_monthly_sales: number;
  last_sale_date: string;
  days_since_last_sale: number;
}[]
```

---

### 4.3 getProductCannibalisation

**Purpose:** Identify potentially competing products based on customer switching patterns

**Parameters:**

- `minSharedCustomers?: number` (default: 5)

**Returns:**

```typescript
{
  product_a_code: string;
  product_a_description: string;
  product_b_code: string;
  product_b_description: string;
  shared_customers: number;
  customers_switching_from_a_to_b: number;
  customers_switching_from_b_to_a: number;
  product_a_revenue_trend: number;
  product_b_revenue_trend: number;
}[]
```

---

### 4.4 getProductMixAnalysis

**Purpose:** Analyze product mix contribution to overall profitability

**Parameters:**

- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  item_code: string;
  product_description: string;
  revenue: number;
  revenue_percent: number;
  margin: number;
  margin_percent_of_total: number;
  cumulative_revenue_percent: number;
  abc_classification: 'A' | 'B' | 'C'; // Based on revenue contribution
}[]
```

---

### 4.5 getCrossSellOpportunities

**Purpose:** Identify products frequently bought together

**Parameters:**

- `minCoOccurrence?: number` (default: 5)
- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  product_a_code: string;
  product_a_description: string;
  product_b_code: string;
  product_b_description: string;
  co_occurrence_count: number;
  customers_buying_both: number;
  confidence: number; // % of customers who buy A also buy B
  lift: number; // How much more likely to buy together
}[]
```

---

## 5. RETURN & CREDIT ANALYSIS

### 5.1 getReturnAnalysis

**Purpose:** Analyze return patterns and impact on profitability

**Parameters:**

- `groupBy?: 'customer' | 'product' | 'month'`
- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  dimension_key: string;
  dimension_name: string;
  total_sales_revenue: number;
  total_returns_value: number;
  return_rate_percent: number;
  net_revenue: number;
  return_count: number;
  sales_count: number;
}[]
```

---

### 5.2 getRebateAnalysis

**Purpose:** Analyze rebates and their impact on margins

**Parameters:**

- `groupBy?: 'customer' | 'month'`
- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  dimension_key: string;
  dimension_name: string;
  total_rebates_given: number;
  rebate_count: number;
  total_sales_to_dimension: number;
  rebate_as_percent_of_sales: number;
  margin_before_rebate: number;
  margin_after_rebate: number;
}[]
```

---

### 5.3 getCreditNoteImpact

**Purpose:** Comprehensive analysis of all credit notes (returns + rebates)

**Parameters:**

- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  total_invoices: number;
  total_invoice_value: number;
  total_credit_notes: number;
  total_credit_note_value: number;
  returns_count: number;
  returns_value: number;
  rebates_count: number;
  rebates_value: number;
  net_revenue: number;
  credit_note_rate_percent: number;
}
```

---

## 6. TIME-BASED TREND ANALYSIS

### 6.1 getSalesTrend

**Purpose:** Track sales performance over time

**Parameters:**

- `groupBy: 'day' | 'week' | 'month' | 'quarter' | 'year'`
- `startDate?: string`
- `endDate?: string`
- `includeReturns?: boolean`

**Returns:**

```typescript
{
  period: string;
  revenue: number;
  cost: number;
  margin: number;
  margin_percent: number;
  transaction_count: number;
  unique_customers: number;
  unique_products: number;
  avg_order_value: number;
  growth_rate_percent?: number; // vs previous period
}[]
```

---

### 6.2 getSeasonalityAnalysis

**Purpose:** Identify seasonal patterns in sales

**Parameters:**

- `groupBy: 'month' | 'quarter' | 'day_of_week'`

**Returns:**

```typescript
{
  period_key: string; // e.g., 'January', 'Q1', 'Monday'
  avg_revenue: number;
  min_revenue: number;
  max_revenue: number;
  std_deviation: number;
  transaction_count: number;
  seasonality_index: number; // vs average
}[]
```

---

### 6.3 getGrowthAnalysis

**Purpose:** Compare period-over-period growth

**Parameters:**

- `currentPeriodStart: string`
- `currentPeriodEnd: string`
- `comparisonType: 'previous_period' | 'year_over_year' | 'custom'`
- `comparisonStart?: string`
- `comparisonEnd?: string`

**Returns:**

```typescript
{
  metric: string;
  current_period_value: number;
  comparison_period_value: number;
  absolute_change: number;
  percent_change: number;
  trend: 'up' | 'down' | 'flat';
}[]
```

---

## 7. DISCOUNT & PROMOTION ANALYSIS

### 7.1 getDiscountEffectiveness

**Purpose:** Measure if discounts drive volume or destroy margin

**Parameters:**

- `startDate?: string`
- `endDate?: string`
- `groupBy?: 'customer' | 'product'`

**Returns:**

```typescript
{
  dimension_key: string;
  dimension_name: string;
  avg_discount_percent: number;
  revenue_with_discount: number;
  revenue_without_discount: number;
  margin_with_discount: number;
  margin_without_discount: number;
  volume_with_discount: number;
  volume_without_discount: number;
  volume_lift_percent: number;
  margin_erosion_percent: number;
}[]
```

---

### 7.2 getSampleAndPromoImpact

**Purpose:** Analyze the cost and potential ROI of samples/promotional items

**Parameters:**

- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  customer_code: string;
  customer_name: string;
  samples_given_count: number;
  samples_given_cost: number;
  total_paid_purchases_revenue: number;
  total_paid_purchases_margin: number;
  sample_to_revenue_ratio: number;
  estimated_roi: number;
}[]
```

---

### 7.3 getHighDiscountAlerts

**Purpose:** Flag unusually high discounts that may indicate errors or policy violations

**Parameters:**

- `thresholdPercent?: number` (default: 20)
- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  invoice_number: string;
  invoice_date: string;
  customer_code: string;
  customer_name: string;
  item_code: string;
  product_description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  line_total: number;
  estimated_margin: number;
  margin_percent: number;
}[]
```

---

## 8. INVENTORY & LOGISTICS ANALYSIS

### 8.1 getPalletOptimization

**Purpose:** Analyze if orders are being optimized for pallet quantities

**Parameters:**

- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  item_code: string;
  product_description: string;
  pallet_quantity: number;
  avg_order_quantity: number;
  orders_matching_pallet: number;
  orders_not_optimized: number;
  optimization_rate_percent: number;
  total_orders: number;
}[]
```

---

### 8.2 getOrderEfficiency

**Purpose:** Measure order sizes and shipping efficiency

**Parameters:**

- `startDate?: string`
- `endDate?: string`
- `groupBy?: 'customer' | 'product'`

**Returns:**

```typescript
{
  dimension_key: string;
  dimension_name: string;
  avg_order_size: number;
  avg_line_items_per_order: number;
  total_pallets_equivalent: number;
  small_orders_count: number; // orders < 1 pallet
  optimal_orders_count: number;
  order_efficiency_score: number;
}[]
```

---

## 9. PRICE TIER & CATALOGUE ANALYSIS

### 9.1 getPriceTierPerformance

**Purpose:** Analyze which price tiers generate the most revenue/margin

**Parameters:**

- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  price_tier: string;
  transaction_count: number;
  revenue: number;
  margin: number;
  margin_percent: number;
  unique_customers: number;
  unique_products: number;
}[]
```

---

### 9.2 getCatalogueCompliance

**Purpose:** Measure how often actual prices deviate from catalogue prices

**Parameters:**

- `startDate?: string`
- `endDate?: string`
- `tolerance?: number` (default: 1%) - Acceptable price variance

**Returns:**

```typescript
{
  item_code: string;
  product_description: string;
  catalogue_price_trade: number;
  compliant_transactions: number;
  non_compliant_transactions: number;
  compliance_rate_percent: number;
  avg_actual_price: number;
  avg_variance_percent: number;
}[]
```

---

### 9.3 getOrphanedProducts

**Purpose:** Identify products in catalogue but never sold, or sold but not in catalogue

**Returns:**

```typescript
{
  item_code: string;
  product_description: string;
  in_catalogue: boolean;
  in_sales: boolean;
  in_landed_costs: boolean;
  has_pallet_data: boolean;
  issue_type: 'never_sold' | 'missing_catalogue' | 'missing_cost' | 'incomplete';
}[]
```

---

## 10. ADVANCED FINANCIAL METRICS

### 10.1 getCustomerMarginContribution

**Purpose:** Calculate each customer's contribution to overall margin

**Parameters:**

- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  customer_code: string;
  customer_name: string;
  margin_contribution: number;
  margin_contribution_percent: number;
  revenue_contribution_percent: number;
  margin_to_revenue_ratio: number; // How efficient is this customer
  cumulative_margin_percent: number;
}[]
```

---

### 10.2 getBreakevenAnalysis

**Purpose:** Calculate break-even pricing for products

**Parameters:**

- `targetMarginPercent?: number` (default: 20)

**Returns:**

```typescript
{
  item_code: string;
  product_description: string;
  landed_cost: number;
  current_avg_price: number;
  current_margin_percent: number;
  breakeven_price: number;
  target_margin_price: number;
  price_increase_needed: number;
  price_increase_percent: number;
}[]
```

---

### 10.3 getWaterfallAnalysis

**Purpose:** Break down revenue flow from gross to net (returns, discounts, etc.)

**Parameters:**

- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  gross_revenue: number;
  less_returns: number;
  less_rebates: number;
  net_revenue: number;
  less_discounts: number;
  revenue_after_discounts: number;
  less_cost_of_goods: number;
  gross_margin: number;
  gross_margin_percent: number;
}
```

---

### 10.4 getPriceElasticity

**Purpose:** Estimate price elasticity based on historical price-volume relationships

**Parameters:**

- `itemCode: string`
- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  item_code: string;
  product_description: string;
  avg_price: number;
  price_std_dev: number;
  avg_volume: number;
  volume_std_dev: number;
  correlation: number;
  estimated_elasticity: number;
  elasticity_interpretation: 'elastic' | 'inelastic' | 'unit_elastic';
}
```

---

### 10.5 getContributionMarginBySegment

**Purpose:** Calculate contribution margin by customer/product segments

**Parameters:**

- `segmentBy: 'customer' | 'product' | 'customer_segment' | 'product_category'`
- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  segment: string;
  revenue: number;
  variable_costs: number;
  contribution_margin: number;
  contribution_margin_percent: number;
  contribution_margin_ratio: number; // CM per dollar of revenue
}[]
```

---

## 11. DATA QUALITY & ANOMALY DETECTION

### 11.1 getAnomalousTransactions

**Purpose:** Detect unusual transactions that may indicate errors

**Parameters:**

- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  invoice_number: string;
  invoice_date: string;
  customer_code: string;
  item_code: string;
  anomaly_type: string; // 'unusual_price', 'unusual_quantity', 'unusual_discount'
  expected_value: number;
  actual_value: number;
  deviation_percent: number;
  data_quality_issue?: string;
}[]
```

---

### 11.2 getDataQualityReport

**Purpose:** Summary of data quality issues in the database

**Returns:**

```typescript
{
  total_sales_records: number;
  records_with_dq_issues: number;
  invoices_with_negative_qty_corrected: number;
  samples_and_promos: number;
  returns: number;
  rebates: number;
  products_missing_cost: number;
  products_missing_catalogue: number;
  customer_name_variations: number;
}
```

---

## 12. EXECUTIVE SUMMARY QUERIES

### 12.1 getExecutiveDashboard

**Purpose:** High-level KPIs for executive overview

**Parameters:**

- `startDate?: string`
- `endDate?: string`
- `comparisonPeriodStart?: string`
- `comparisonPeriodEnd?: string`

**Returns:**

```typescript
{
  total_revenue: number;
  total_cost: number;
  gross_margin: number;
  gross_margin_percent: number;
  transaction_count: number;
  unique_customers: number;
  unique_products: number;
  avg_order_value: number;
  top_customer_concentration_percent: number;
  negative_margin_customers_count: number;
  negative_margin_amount: number;
  return_rate_percent: number;
  avg_discount_percent: number;
  period_over_period_growth?: number;
}
```

---

### 12.2 getProblemAreasReport

**Purpose:** Identify top areas of concern requiring attention

**Parameters:**

- `startDate?: string`
- `endDate?: string`

**Returns:**

```typescript
{
  negative_margin_customers: Array<{customer_code: string, margin: number}>;
  high_return_rate_products: Array<{item_code: string, return_rate: number}>;
  excessive_discount_transactions: Array<{invoice_number: string, discount: number}>;
  inactive_high_value_customers: Array<{customer_code: string, days_inactive: number}>;
  slow_moving_inventory: Array<{item_code: string, days_since_sale: number}>;
}
```

---

## 13. FORECASTING & PREDICTIVE QUERIES

### 13.1 getRevenueForecast

**Purpose:** Simple moving average forecast based on historical trends

**Parameters:**

- `periods?: number` (default: 3) - Number of future periods to forecast
- `periodType?: 'month' | 'quarter'`

**Returns:**

```typescript
{
  forecast_period: string;
  forecasted_revenue: number;
  forecasted_margin: number;
  confidence_level: 'high' | 'medium' | 'low';
  based_on_periods: number;
}[]
```

---

### 13.2 getCustomerLifetimeValuePrediction

**Purpose:** Predict future customer value based on purchase patterns

**Parameters:**

- `customerCode?: string`

**Returns:**

```typescript
{
  customer_code: string;
  customer_name: string;
  historical_ltv: number;
  predicted_next_12_months_revenue: number;
  predicted_next_12_months_margin: number;
  confidence_score: number;
  churn_risk: 'high' | 'medium' | 'low';
}[]
```

---

## Implementation Notes

### Date Handling

- All dates should be in ISO format (YYYY-MM-DD)
- Use SQLite date functions for filtering: `WHERE invoice_date BETWEEN ? AND ?`
- Default date range: last 12 months if not specified

### Cost Calculations

- Always use `quantity_corrected` and `unit_price_corrected` from sales table
- Join with `landed_costs` table on `item_code` for cost data
- Handle NULL costs gracefully (some products may not have cost data)

### Filtering Best Practices

- Exclude samples by default: `is_sample = 0`
- Exclude returns by default unless specifically requested: `is_return = 0`
- Filter to invoices only: `document_type = 'INV'`
- Use standardized customer names: `customer_name_standardized`

### Performance Optimization

- All key columns are indexed (item_code, customer_code, invoice_date)
- Use prepared statements for parameterized queries
- Consider using views for complex repeated joins

### Error Handling

- Handle division by zero in margin calculations
- Check for NULL landed costs before calculating margins
- Validate date ranges
- Return empty arrays rather than errors when no data found

---

## Total Function Count: 48 Core Query Functions

This comprehensive set covers:

- ✅ Margin & Profitability Analysis (5 functions)
- ✅ Pricing Analysis (5 functions)
- ✅ Customer Analysis (5 functions)
- ✅ Product Analysis (5 functions)
- ✅ Return & Credit Analysis (3 functions)
- ✅ Time-based Trends (3 functions)
- ✅ Discount & Promotion Analysis (3 functions)
- ✅ Inventory & Logistics (2 functions)
- ✅ Price Tier & Catalogue Analysis (3 functions)
- ✅ Advanced Financial Metrics (5 functions)
- ✅ Data Quality & Anomaly Detection (2 functions)
- ✅ Executive Summary (2 functions)
- ✅ Forecasting & Predictive (2 functions)
