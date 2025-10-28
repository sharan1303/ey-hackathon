<!-- 8ee0a003-925e-4125-91a6-aa28948690e0 cf4cf012-d897-4687-a253-98bf36a4d556 -->
# Refactor Queries to Separate Data from Calculations

## Overview

Restructure the queries directory to separate data fetching (SQL) from calculations and filtering (TypeScript), making queries general-purpose and reusable across different tools.

## Implementation Steps

### 1. Create Base Query Functions

Create new files with domain-specific base queries:

**`base-queries/sales-transactions.ts`**

- `getSalesTransactions()` - Returns raw sales records with joins (landed_costs, catalogue_prices, customer_product_keys, pallet_sizes)
- Fields: all raw transaction data without calculations
- Filters: only essential (date range, document_type, is_sample, is_return)
- No aggregations, no business logic filters

**`base-queries/customer-sales.ts`**

- `getCustomerSales()` - Returns sales data grouped by customer
- Aggregates: SUM(quantity), SUM(line_total), COUNT(*), COUNT(DISTINCT item_code)
- No calculated fields like margin or margin_percent

**`base-queries/product-sales.ts`**

- `getProductSales()` - Returns sales data grouped by product
- Aggregates: SUM(quantity), SUM(line_total), COUNT(*), COUNT(DISTINCT customer_code)
- No calculated fields like margin or margin_percent

### 2. Install decimal.js-light

Add `decimal.js-light` as a dependency for precise financial calculations:

```bash
cd app && pnpm add decimal.js-light
```

### 3. Create Calculation Utilities

Create **`utils/calculations.ts`** with pure functions using `decimal.js-light`:

- `calculateMargin(revenue, cost)` - Returns margin amount (using Decimal)
- `calculateMarginPercent(revenue, cost)` - Returns margin percentage (using Decimal)
- `calculateAveragePrice(totalRevenue, quantity)` - Returns avg price (using Decimal)
- `filterNegativeMargins(data)` - Filters records with margin < 0
- `filterHighDiscounts(data, threshold)` - Filters by discount threshold
- `sortByField(data, field, order)` - Generic sorting function
- `limitResults(data, limit)` - Generic limit function

All financial calculations will use Decimal to avoid floating-point precision issues. Results will be returned as numbers with appropriate rounding.

### 3. Refactor Existing Query Functions

Update each query file to use base queries + utilities:

**`get-negative-margins-by-sku.ts`**

- Use `getProductSales()` base query
- Apply TypeScript calculations for margin/margin_percent
- Filter for negative margins in TypeScript
- Apply minTransactions filter in TypeScript

**`get-negative-margins-by-customer.ts`**

- Use `getCustomerSales()` base query
- Apply calculations in TypeScript
- Filter for negative margins in TypeScript

**`get-customer-profitability.ts`**

- Use `getCustomerSales()` base query
- Calculate margins in TypeScript
- Sort and limit in TypeScript

**`get-product-performance.ts`**

- Use `getProductSales()` base query
- Calculate margins in TypeScript
- Sort and limit in TypeScript

**`get-executive-dashboard.ts`**

- Use multiple base queries or `getSalesTransactions()`
- Perform all aggregations in TypeScript
- Call other refactored functions for composed metrics

**`get-problem-areas-report.ts`**

- Already uses other query functions
- Update to work with refactored dependencies
- Add any additional TypeScript filtering needed

### 4. Update Index Exports

Update **`queries/index.ts`** to export:

- All base query functions
- All calculation utilities
- All existing query functions (refactored)

## Key Files Changed

- New: `app/src/lib/queries/base-queries/sales-transactions.ts`
- New: `app/src/lib/queries/base-queries/customer-sales.ts`
- New: `app/src/lib/queries/base-queries/product-sales.ts`
- New: `app/src/lib/queries/utils/calculations.ts`
- Modified: All 6 existing query files
- Modified: `app/src/lib/queries/index.ts`

## Benefits

- Tools can use base queries with custom calculations
- Business logic is transparent and modifiable in TypeScript
- Queries are reusable across different use cases
- Easier to test calculations independently
- More flexible for AI agents to compose different analyses

### To-dos

- [ ] Create base query functions in new base-queries/ directory (sales-transactions, customer-sales, product-sales)
- [ ] Create calculation utility functions in utils/calculations.ts
- [ ] Refactor get-negative-margins-by-sku.ts and get-negative-margins-by-customer.ts to use base queries + calculations
- [ ] Refactor get-customer-profitability.ts and get-product-performance.ts to use base queries + calculations
- [ ] Refactor get-executive-dashboard.ts and get-problem-areas-report.ts to use base queries + calculations
- [ ] Update index.ts to export all new base queries and utilities