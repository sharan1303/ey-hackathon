# Data Cleaning Report

## Summary

This report documents the data cleaning operations performed on the Voltura Group dataset with business rule enforcement.

**Date:** 2025-10-27

**Original Database:** `voltura_data.db`

**Cleaned Database:** `data/voltura_data_cleaned.db`

## Document Classification

| Document Type | Count | Description |
|---------------|-------|-------------|
| Invoice (INV) | 673065 | Regular sales transactions |
| Credit Note (CRN) | 63326 | Returns, rebates, and adjustments |

## Business Rules Applied

### 1. Price Handling

**Price < 0 on Credit Note (Rebate):**

- Records flagged: 306
- Action: Kept as negative, marked `is_rebate = 1`
- Reason: Indicates margin adjustment, not a sale error

**Price between 0 and 0.1 on Invoice (Sample):**

- Records flagged: Included in sample count below
- Action: Marked `is_sample = 1`
- Reason: Represents product sample, not sale

**Price = 0 with Quantity > 0 (Free/Promo):**

- Records flagged: 32100
- Action: Kept as-is, marked `is_sample = 1`
- Reason: May be part of promotional strategy

### 2. Quantity Handling

**Negative Quantity on Invoice (DQ Error):**

- Records corrected: 1558
- Action: Converted to positive value in `quantity_corrected`
- Reason: No invoice should have negative sold quantity

**Negative Quantity on Credit Note (Return):**

- Records flagged: 63020
- Action: Kept as negative, marked `is_return = 1`
- Reason: Negative quantity means goods returned

**Positive Quantity on Credit Note (Rebate):**

- Records flagged: 306
- Action: Kept as positive, marked `is_rebate = 1`
- Reason: Represents rebate, not physical return

**Fractional Quantity (Meter Sales):**

- Records flagged: 155
- Action: Marked `unit_type = 'meter'`
- Reason: Represents fractional sale (not an error)

### 3. Data Quality Corrections

The following columns were added to track corrections:

- `quantity_corrected` - Corrected quantity values
- `unit_price_corrected` - Corrected price values
- `data_quality_issue` - Description of any DQ issues found

### 4. Duplicate Removal

**Catalogue Prices:**

- Duplicates removed: 148
- Final record count: 1053

**Landed Costs:**

- Duplicates removed: 148
- Final record count: 982

**Pallet Sizes:**

- Empty records removed: 0
- Final record count: 86

### 5. Customer Name Standardization

**Sales Table:**

- Customer codes processed: 2076
- Customer codes with name variations: 196

**Top Customer Name Variations:**

| Customer Code | Variations | Standardized Name | Total Records |
|---------------|------------|-------------------|---------------|
| ALE01 | 2 | Alera Isla KLB (Kilrush) | 229 |
| AMP01 | 5 | Ampere Electronics Company | 1682 |
| AMP02 | 2 | Ampere Electronics LTD | 43 |
| AMP03 | 4 | Ampere Electronics Company | 682 |
| AMP04 | 2 | Ampere Electronics LTD | 1488 |
| AMP06 | 2 | Ampere Electronic PLC | 68 |
| AMP07 | 2 | Ampere Electrical PLC | 5 |
| AMP12 | 2 | Ampere Electrical PLC | 27 |
| AUR01 | 2 | Auric AGENCIES LTD. | 130 |
| BOL02 | 2 | Bolt Electrical LTD | 521 |

*Showing top 10 of 196 customer codes with variations.*

## Final Table Statistics

| Table | Record Count |
|-------|--------------|
| catalogue_prices | 1053 |
| landed_costs | 982 |
| sales | 736391 |
| customer_product_keys | 2319 |
| pallet_sizes | 86 |

## New Columns Added to Sales Table

| Column | Type | Description |
|--------|------|-------------|
| `document_type` | TEXT | 'INV' for Invoice, 'CRN' for Credit Note |
| `is_rebate` | INTEGER | 1 if record is a rebate/margin adjustment |
| `is_return` | INTEGER | 1 if record is a product return |
| `is_sample` | INTEGER | 1 if record is a sample/free item |
| `unit_type` | TEXT | 'meter' for fractional quantities, NULL otherwise |
| `quantity_corrected` | REAL | Corrected quantity (after DQ fixes) |
| `unit_price_corrected` | REAL | Corrected unit price (after DQ fixes) |
| `data_quality_issue` | TEXT | Description of any DQ issue found |
| `customer_name_standardized` | TEXT | Standardized customer name |

## Usage Examples

### Query invoices only (excluding returns/rebates)

```sql
SELECT * FROM sales 
WHERE document_type = 'INV' 
  AND is_sample = 0;
```

### Calculate net sales (excluding returns)

```sql
SELECT 
  customer_code,
  customer_name_standardized,
  SUM(CASE WHEN is_return = 0 THEN line_total ELSE 0 END) as net_revenue
FROM sales
GROUP BY customer_code, customer_name_standardized;
```

### Find products sold by meter

```sql
SELECT item_code, quantity_corrected, unit_type
FROM sales
WHERE unit_type = 'meter';
```

### Review data quality issues

```sql
SELECT invoice_number, item_code, quantity, quantity_corrected, data_quality_issue
FROM sales
WHERE data_quality_issue IS NOT NULL;
```

## TypeScript Usage

```typescript
import Database from 'better-sqlite3';
const db = new Database('data/voltura_data_cleaned.db');

// Get actual sales (excluding returns, rebates, samples)
const actualSales = db.prepare(`
  SELECT 
    customer_name_standardized,
    SUM(quantity_corrected * unit_price_corrected) as revenue
  FROM sales
  WHERE document_type = 'INV'
    AND is_return = 0
    AND is_rebate = 0
    AND is_sample = 0
  GROUP BY customer_name_standardized
  ORDER BY revenue DESC
`).all();
```

## Notes

- Original database remains unchanged at `voltura_data.db`
- All cleaning operations were performed in transactions
- Business rules preserve data while adding metadata for analysis
- Use corrected columns (`quantity_corrected`, `unit_price_corrected`) for accurate analysis
