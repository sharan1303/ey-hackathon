# Database Schema Documentation

This document describes the database schema for the Voltura Group data warehouse.

## Overview

The database consists of 5 main tables and 4 analytical views designed to support product pricing, sales analysis, and customer relationship management.

## Tables

### 1. catalogue_prices

Product catalogue with various price tiers for different customer segments.

**Columns:**

- `id` (INTEGER, PRIMARY KEY) - Auto-incrementing unique identifier
- `item_code` (TEXT, NOT NULL) - Product SKU/code
- `ie_trade` (REAL) - Trade price tier
- `ie_high` (REAL) - High price tier
- `ie_mid` (REAL) - Mid price tier
- `ie_low` (REAL) - Low price tier
- `ie_base` (REAL) - Base price tier
- `ie_edm` (REAL) - EDM price tier
- `ie_anew` (REAL) - ANEW price tier
- `created_at` (DATETIME) - Record creation timestamp

**Indexes:**

- `idx_catalogue_item_code` on `item_code`

**Source:** `voltura_group_catalogue_price.csv`

---

### 2. landed_costs

Product cost information including landed costs and markup calculations.

**Columns:**

- `id` (INTEGER, PRIMARY KEY) - Auto-incrementing unique identifier
- `item_code` (TEXT, NOT NULL) - Product SKU/code
- `landed_cost_euro` (REAL) - Base landed cost in euros
- `plus_5_percent` (REAL) - Cost with 5% markup
- `created_at` (DATETIME) - Record creation timestamp

**Indexes:**

- `idx_landed_item_code` on `item_code`

**Source:** `voltura_group_landed_cost_july.csv`

---

### 3. sales

Sales transaction records with complete order details.

**Columns:**

- `id` (INTEGER, PRIMARY KEY) - Auto-incrementing unique identifier
- `customer_code` (TEXT) - Customer identifier
- `customer_name` (TEXT) - Customer name
- `region` (TEXT) - Customer region (e.g., IESER, IEWR, IEHA, IENI, IENR, IESC, IEKAR)
- `invoice_number` (TEXT) - Invoice reference number (also called Document Number)
- `document_type` (TEXT) - Transaction type (CRN for Credit Note, INV for Invoice)
- `invoice_date` (TEXT) - Date of invoice (YYYY-MM-DD format)
- `item_code` (TEXT) - Product SKU/code
- `item_description` (TEXT) - Product description
- `quantity` (INTEGER) - Number of units sold
- `currency` (TEXT) - Transaction currency (always EUR in cleaned database)
- `unit_price` (REAL) - Price per unit in EUR
- `line_total` (REAL) - Total line amount (quantity × unit_price - discount) in EUR
- `created_at` (DATETIME) - Record creation timestamp

**Currency Conversion:** In the cleaned database (`voltura_data_cleaned.db`), all GBP transactions have been converted to EUR using an exchange rate of 1 GBP = 1.15 EUR. This ensures all financial calculations (margins, costs, revenues) use the same currency base.

**Note:** Discount percentages are not stored in the database but calculated dynamically by comparing `line_total` against catalogue prices (typically `ie_base`) using the formula: `((quantity × catalogue_price) - line_total) / (quantity × catalogue_price) × 100`

**Indexes:**

- `idx_sales_item_code` on `item_code`
- `idx_sales_customer` on `customer_code`
- `idx_sales_invoice` on `invoice_number`
- `idx_sales_date` on `invoice_date`
- `idx_sales_region` on `region`
- `idx_sales_document_type` on `document_type`

**Source:** `voltura_group_sales.csv`

**Note:** The cleaned database (`voltura_data_cleaned.db`) has these differences from the original:

- **Currency conversion**: All GBP values converted to EUR (1 GBP = 1.15 EUR)
- **Currency standardization**: `currency` column always contains 'EUR'
- Includes `item_description` column (product description text)
- `is_rebate` - Flag for rebate/margin adjustments
- `is_return` - Flag for product returns
- `is_sample` - Flag for samples/free items
- `unit_type` - Type indicator (e.g., 'meter' for fractional quantities)
- `data_quality_issue` - Description of any data quality issues found
- `customer_name` contains standardized customer names
- All monetary values (`unit_price`, `line_total`) are in EUR

---

### 4. customer_product_keys

Customer master data (Note: Despite the filename, this contains only customer information, not product mapping).

**Columns:**

- `id` (INTEGER, PRIMARY KEY) - Auto-incrementing unique identifier
- `customer_code` (TEXT) - Customer identifier
- `customer_name` (TEXT) - Customer name
- `buying_group` (TEXT) - Customer buying group affiliation (e.g., UNI-IE, IDK-IE, Pave-IE, APIGG, EMAI)
- `region` (TEXT) - Customer region
- `account_manager` (TEXT) - Assigned account manager name
- `created_at` (DATETIME) - Record creation timestamp

**Indexes:**

- `idx_cpk_customer` on `customer_code`
- `idx_cpk_region` on `region`

**Source:** `Voltura Group Customer_Product Key.xlsx`

**Data Quality:** All records contain complete data for all columns (no missing values).

---

### 5. pallet_sizes

Pallet, carton, and single unit quantity information for inventory and logistics planning.

**Columns:**

- `id` (INTEGER, PRIMARY KEY) - Auto-incrementing unique identifier
- `item_code` (TEXT) - Product SKU/code
- `pallet_quantity` (INTEGER) - Number of units per pallet
- `carton_quantity` (INTEGER) - Number of units per carton
- `single_quantity` (INTEGER) - Single unit quantity information
- `created_at` (DATETIME) - Record creation timestamp

**Indexes:**

- `idx_pallet_item_code` on `item_code`

**Source:** `Voltura_group_pallet_size.xlsx`

---

## Analytical Views

### vw_product_pricing

Complete product pricing information combining catalogue prices, costs, and pallet data.

**Columns:** All columns from `catalogue_prices`, `landed_costs`, and `pallet_sizes` joined on `item_code`

**Usage:**

```sql
SELECT * FROM vw_product_pricing WHERE item_code = 'IEZ51697949';
```

---

### vw_sales_by_customer

Customer sales summary with key metrics.

**Columns:**

- `customer_code` - Customer identifier
- `customer_name` - Customer name
- `total_invoices` - Number of unique invoices
- `total_line_items` - Number of line items
- `total_quantity` - Total units purchased
- `total_revenue` - Total sales amount
- `avg_line_value` - Average line item value
- `first_purchase_date` - Date of first purchase
- `last_purchase_date` - Date of most recent purchase

**Usage:**

```sql
SELECT * FROM vw_sales_by_customer 
ORDER BY total_revenue DESC 
LIMIT 10;
```

---

### vw_sales_by_product

Product sales summary with pricing information.

**Columns:**

- `item_code` - Product SKU/code
- `unique_customers` - Number of unique customers
- `total_invoices` - Number of invoices
- `total_quantity_sold` - Total units sold
- `total_revenue` - Total sales amount
- `avg_unit_price` - Average unit price
- `ie_trade` - Trade price tier
- `ie_base` - Base price tier
- `landed_cost_euro` - Product cost

**Usage:**

```sql
SELECT * FROM vw_sales_by_product 
ORDER BY total_quantity_sold DESC 
LIMIT 10;
```

---

### vw_monthly_sales

Monthly sales trends and aggregations.

**Columns:**

- `month` - Month in YYYY-MM format
- `unique_customers` - Number of unique customers
- `total_invoices` - Number of invoices
- `total_line_items` - Number of line items
- `total_quantity` - Total units sold
- `total_revenue` - Total sales amount
- `avg_line_value` - Average line item value

**Usage:**

```sql
SELECT * FROM vw_monthly_sales 
ORDER BY month DESC;
```

---

## Example Queries

### Find all products with margin > 20%

```sql
SELECT 
    pp.*,
    ((pp.ie_trade - pp.landed_cost_euro) / pp.landed_cost_euro * 100) as margin_percent
FROM vw_product_pricing pp
WHERE ((pp.ie_trade - pp.landed_cost_euro) / pp.landed_cost_euro * 100) > 20
ORDER BY margin_percent DESC;
```

### Top 10 customers by revenue

```sql
SELECT * FROM vw_sales_by_customer
ORDER BY total_revenue DESC
LIMIT 10;
```

### Sales trend by month

```sql
SELECT 
    month,
    total_revenue,
    total_quantity,
    LAG(total_revenue) OVER (ORDER BY month) as prev_month_revenue
FROM vw_monthly_sales
ORDER BY month;
```

### Products never sold

```sql
SELECT cp.item_code, cp.ie_trade
FROM catalogue_prices cp
LEFT JOIN sales s ON cp.item_code = s.item_code
WHERE s.item_code IS NULL;
```

---

## Files

- **Schema Definition:** `app/schema.sql`
- **Schema Manager:** `app/src/schema.ts`
- **Data Import:** `app/src/import-data.ts`
