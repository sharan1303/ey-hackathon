<!-- f364ddd3-813b-4359-a482-d508f252df61 dcb10252-1588-472d-9645-3e2301d5b90b -->
# Merge Margin Analysis and Profitability Tools

## Overview

Consolidate two overlapping tools into one flexible margin analysis tool that can analyze any margin scenario (high, low, positive, negative) with comprehensive filtering and sorting options.

## Changes

### 1. Enhance and Rename Profitability Tool → Margin Analysis Tool

**File**: `app/src/tools/profitability-tool.ts` → `app/src/tools/margin-analysis-tool.ts` (replace existing)

**Changes**:

- Rename tool ID: `profitability-analysis` → `margin-analysis`
- Update description to emphasize margin analysis flexibility (not just "profitability")
- Add margin filter parameters:
- `minMarginPercent`: Filter for margins above threshold
- `maxMarginPercent`: Filter for margins below threshold
- `minTransactions`: Filter by minimum transaction count
- `minRevenue`: Filter by minimum revenue
- Keep all existing flexibility: sortBy, order, limit, includeReturns
- Apply filters in the query layer (pass to underlying base queries where possible) and TypeScript layer (for margin percent filters)

**Why**: Creates one comprehensive tool that handles all margin analysis scenarios instead of two limited, overlapping tools.

### 2. Update Base Queries to Accept New Filters

**Files**:

- `app/src/lib/queries/get-customer-profitability.ts`
- `app/src/lib/queries/get-product-performance.ts`

**Changes**:

- Add optional filter parameters: `minMarginPercent`, `maxMarginPercent`, `minRevenue`
- Apply margin percent filters after calculations (since margin isn't in SQL)
- Pass minRevenue to base query functions (already supported in customer-sales/product-sales)

**Why**: Push filtering down to the query layer for better performance.

### 3. Delete Old Margin Analysis Tool Files

**Files to delete**:

- `app/src/tools/margin-analysis-tool.ts` (replaced by enhanced profitability tool)
- `app/src/lib/queries/get-negative-margins-by-customer.ts` (no longer needed)
- `app/src/lib/queries/get-negative-margins-by-sku.ts` (no longer needed)

**Why**: Remove redundant code and reduce maintenance burden.

### 4. Update Data Query Tool

**File**: `app/src/tools/data-query-tool.ts`

**Changes**:

- Change default limit from 100 to 50 (line 60)

**Why**: Reduce amount of raw data returned by default.

### 5. Update Agent Configuration

**File**: `app/src/agents/pricing-agent.ts`

**Changes**:

- Update tool import: Remove old marginAnalysisTool import, update to new margin-analysis tool
- Update instructions section "Available Tools" (lines 30-34)
- Update "When to Use Each Tool" (lines 36-40)
- Revise margin analysis guidance to emphasize flexibility (can analyze negative, low, high, any margin threshold)
- Update example workflows to show margin filtering options

**Why**: Align agent behavior with new unified tool capabilities.

### 6. Update Query Index Exports

**File**: `app/src/lib/queries/index.ts`

**Changes**:

- Remove exports: `getNegativeMarginsByCustomer`, `getNegativeMarginsBySKU`
- Ensure exports remain: `getCustomerProfitability`, `getProductPerformance`

**Why**: Clean up public API to reflect consolidated architecture.

## Implementation Notes

- The new margin-analysis tool should support all scenarios:
- Negative margins: `sortBy='margin', order='asc', maxMarginPercent=0`
- Low margins: `sortBy='margin_percent', order='asc', maxMarginPercent=20`
- High margins: `sortBy='margin_percent', order='desc', minMarginPercent=50`
- Top performers: `sortBy='margin', order='desc'`
- Active customers only: `minTransactions=10, minRevenue=10000`

- Tool description should guide the agent on how to use filters effectively

## Files Modified

1. `app/src/tools/profitability-tool.ts` → `app/src/tools/margin-analysis-tool.ts`
2. `app/src/lib/queries/get-customer-profitability.ts`
3. `app/src/lib/queries/get-product-performance.ts`
4. `app/src/tools/data-query-tool.ts`
5. `app/src/agents/pricing-agent.ts`
6. `app/src/lib/queries/index.ts`

## Files Deleted

1. `app/src/lib/queries/get-negative-margins-by-customer.ts`
2. `app/src/lib/queries/get-negative-margins-by-sku.ts`

### To-dos

- [ ] Enhance profitability tool with margin filters (minMarginPercent, maxMarginPercent, minTransactions, minRevenue), rename to margin-analysis-tool.ts
- [ ] Add margin filter parameters to get-customer-profitability.ts and get-product-performance.ts
- [ ] Delete old margin-analysis-tool.ts and negative margin query files
- [ ] Change data-query-tool.ts default limit from 100 to 50
- [ ] Update pricing-agent.ts imports and instructions for new unified margin tool
- [ ] Update queries/index.ts to remove old negative margin exports