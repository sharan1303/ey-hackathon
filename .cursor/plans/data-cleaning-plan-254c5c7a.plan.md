<!-- 254c5c7a-ad88-4526-bddf-db25f87eafcd 61c20605-0630-4d72-8eed-66228f6a234a -->
# Data Cleaning Plan

## Issues to Address

Based on analysis of 1.47M sales records and supporting tables:

1. **Duplicate item codes** - ~20 duplicates in catalogue_prices and landed_costs (exact duplicates)
2. **Empty item codes** - 172 records in pallet_sizes with NULL/empty item_code
3. **Customer name variations** - Same customer_code with multiple name spellings (e.g., AMP01 has 5 variations)
4. **Missing values** - 16 sales without unit_price, 86 catalogue items missing price tiers, 52 landed costs missing values

**Note:** Preserving negative quantities (returns/credit notes), zero prices (promotions), and orphaned sales records (valid transactions).

## Cleaning Steps

### 1. Remove Duplicate Item Codes

**Tables:** `catalogue_prices`, `landed_costs`

Remove exact duplicate rows, keeping only the first occurrence per item_code:

- **catalogue_prices**: ~20 duplicates to remove
- **landed_costs**: ~20 duplicates to remove

### 2. Remove Empty Item Codes from Pallet Sizes

**Table:** `pallet_sizes`

Delete 172 records where `item_code` IS NULL or empty string - these records are unusable for joins.

### 3. Standardize Customer Names

**Table:** `sales`

Add new column `customer_name_standardized` with the most common name variant per customer_code:

- Identify most frequent name for each customer_code
- Create new column and populate it
- Keep original `customer_name` column for audit trail

Example: AMP01 → "Ampere Electronics Company" (appears 2,256 times vs other variants)

### 4. Document Data Quality Findings

Create summary report of:

- Records cleaned per table
- Preserved data (returns, zero-prices, orphans)
- Customer name standardization mapping
- Remaining data quality notes

## Implementation Approach

Create a TypeScript script `data/src/clean-data.ts` that:

1. Copies `voltura_data.db` → `voltura_data_cleaned.db`
2. Connects to the new cleaned database
3. Runs cleaning operations in transactions
4. Logs all changes for audit trail
5. Outputs summary statistics

**Database Structure:**

- `data/voltura_data.db` - Original, untouched 1:1 mapping of source data (root level)
- `data/voltura_data_cleaned.db` - Cleaned version for analysis and reporting

## Files to Create

- **New:** `data/src/clean-data.ts` - Main cleaning script that creates and cleans new database
- **New:** `data/spec/data-cleaning-report.md` - Summary report of cleaning operations

### To-dos

- [ ] Create database backup before cleaning operations
- [ ] Remove duplicate item codes from catalogue_prices and landed_costs tables
- [ ] Remove records with empty/NULL item codes from pallet_sizes
- [ ] Add customer_name_standardized column to sales table schema
- [ ] Populate customer_name_standardized with most common name per customer_code
- [ ] Generate data cleaning summary report with statistics