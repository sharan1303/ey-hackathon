-- Data Quality Check Queries

-- 1. Check for NULL/missing values in key fields
.print "=== MISSING VALUES ANALYSIS ==="
.print ""

.print "Sales Table - Missing Values:"
SELECT 
  COUNT(*) as total_records,
  SUM(CASE WHEN invoice_number IS NULL THEN 1 ELSE 0 END) as missing_invoice_number,
  SUM(CASE WHEN invoice_date IS NULL THEN 1 ELSE 0 END) as missing_invoice_date,
  SUM(CASE WHEN customer_code IS NULL THEN 1 ELSE 0 END) as missing_customer_code,
  SUM(CASE WHEN customer_name IS NULL THEN 1 ELSE 0 END) as missing_customer_name,
  SUM(CASE WHEN item_code IS NULL THEN 1 ELSE 0 END) as missing_item_code,
  SUM(CASE WHEN quantity IS NULL THEN 1 ELSE 0 END) as missing_quantity,
  SUM(CASE WHEN unit_price IS NULL THEN 1 ELSE 0 END) as missing_unit_price,
  SUM(CASE WHEN line_total IS NULL THEN 1 ELSE 0 END) as missing_line_total
FROM sales;

.print ""
.print "Catalogue Prices - Missing Values:"
SELECT 
  COUNT(*) as total_records,
  SUM(CASE WHEN item_code IS NULL THEN 1 ELSE 0 END) as missing_item_code,
  SUM(CASE WHEN ie_trade IS NULL THEN 1 ELSE 0 END) as missing_ie_trade,
  SUM(CASE WHEN ie_high IS NULL THEN 1 ELSE 0 END) as missing_ie_high
FROM catalogue_prices;

.print ""
.print "Landed Costs - Missing Values:"
SELECT 
  COUNT(*) as total_records,
  SUM(CASE WHEN item_code IS NULL THEN 1 ELSE 0 END) as missing_item_code,
  SUM(CASE WHEN landed_cost_euro IS NULL THEN 1 ELSE 0 END) as missing_landed_cost
FROM landed_costs;

-- 2. Check for duplicate records
.print ""
.print "=== DUPLICATE RECORDS ANALYSIS ==="
.print ""

.print "Duplicate Item Codes in Catalogue Prices:"
SELECT item_code, COUNT(*) as count
FROM catalogue_prices
GROUP BY item_code
HAVING COUNT(*) > 1
LIMIT 10;

.print ""
.print "Duplicate Item Codes in Landed Costs:"
SELECT item_code, COUNT(*) as count
FROM landed_costs
GROUP BY item_code
HAVING COUNT(*) > 1
LIMIT 10;

.print ""
.print "Duplicate Item Codes in Pallet Sizes:"
SELECT item_code, COUNT(*) as count
FROM pallet_sizes
GROUP BY item_code
HAVING COUNT(*) > 1
LIMIT 10;

-- 3. Check for orphaned records (referential integrity)
.print ""
.print "=== REFERENTIAL INTEGRITY ISSUES ==="
.print ""

.print "Sales with Item Codes not in Catalogue:"
SELECT COUNT(DISTINCT s.item_code) as orphaned_item_codes
FROM sales s
LEFT JOIN catalogue_prices c ON s.item_code = c.item_code
WHERE c.item_code IS NULL;

.print ""
.print "Sample Orphaned Item Codes (first 10):"
SELECT DISTINCT s.item_code
FROM sales s
LEFT JOIN catalogue_prices c ON s.item_code = c.item_code
WHERE c.item_code IS NULL
LIMIT 10;

.print ""
.print "Sales with Customer Codes not in Customer Product Keys:"
SELECT COUNT(DISTINCT s.customer_code) as orphaned_customer_codes
FROM sales s
LEFT JOIN customer_product_keys cpk ON s.customer_code = cpk.customer_code
WHERE cpk.customer_code IS NULL AND s.customer_code IS NOT NULL;

-- 4. Check for invalid dates
.print ""
.print "=== DATE VALIDATION ==="
.print ""

.print "Invalid or Suspicious Dates in Sales:"
SELECT 
  COUNT(*) as records_with_invalid_dates,
  MIN(invoice_date) as earliest_date,
  MAX(invoice_date) as latest_date
FROM sales
WHERE invoice_date IS NULL 
   OR invoice_date NOT LIKE '____-__-__'
   OR CAST(SUBSTR(invoice_date, 1, 4) AS INTEGER) < 2000
   OR CAST(SUBSTR(invoice_date, 1, 4) AS INTEGER) > 2025;

-- 5. Check for negative or zero values
.print ""
.print "=== VALUE VALIDATION ==="
.print ""

.print "Sales with Zero or Negative Quantities:"
SELECT COUNT(*) as count
FROM sales
WHERE quantity IS NOT NULL AND quantity <= 0;

.print ""
.print "Sales with Zero or Negative Prices:"
SELECT COUNT(*) as count
FROM sales
WHERE unit_price IS NOT NULL AND unit_price <= 0;

.print ""
.print "Catalogue Prices with Zero or Negative Values:"
SELECT 
  SUM(CASE WHEN ie_trade IS NOT NULL AND ie_trade <= 0 THEN 1 ELSE 0 END) as negative_ie_trade,
  SUM(CASE WHEN ie_high IS NOT NULL AND ie_high <= 0 THEN 1 ELSE 0 END) as negative_ie_high,
  SUM(CASE WHEN ie_mid IS NOT NULL AND ie_mid <= 0 THEN 1 ELSE 0 END) as negative_ie_mid
FROM catalogue_prices;

.print ""
.print "Landed Costs with Zero or Negative Values:"
SELECT COUNT(*) as count
FROM landed_costs
WHERE landed_cost_euro IS NOT NULL AND landed_cost_euro <= 0;

-- 6. Check for data consistency
.print ""
.print "=== DATA CONSISTENCY CHECKS ==="
.print ""

.print "Sales where line_total != quantity * unit_price:"
SELECT COUNT(*) as inconsistent_records
FROM sales
WHERE quantity IS NOT NULL 
  AND unit_price IS NOT NULL 
  AND line_total IS NOT NULL
  AND ABS(line_total - (quantity * unit_price)) > 0.01;

.print ""
.print "Customer Name Variations for Same Code:"
SELECT customer_code, COUNT(DISTINCT customer_name) as name_variations
FROM sales
WHERE customer_code IS NOT NULL
GROUP BY customer_code
HAVING COUNT(DISTINCT customer_name) > 1
LIMIT 10;

-- 7. Check for whitespace issues
.print ""
.print "=== WHITESPACE AND FORMATTING ISSUES ==="
.print ""

.print "Item Codes with Leading/Trailing Spaces in Sales:"
SELECT COUNT(*) as count
FROM sales
WHERE item_code != TRIM(item_code);

.print ""
.print "Customer Codes with Leading/Trailing Spaces:"
SELECT COUNT(*) as count
FROM sales
WHERE customer_code != TRIM(customer_code);

