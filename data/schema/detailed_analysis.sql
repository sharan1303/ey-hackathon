-- More detailed analysis

.print "=== DETAILED ANALYSIS ==="
.print ""

.print "Sample Sales with Negative/Zero Quantities:"
SELECT invoice_number, invoice_date, customer_code, item_code, quantity, unit_price, line_total
FROM sales
WHERE quantity IS NOT NULL AND quantity <= 0
LIMIT 5;

.print ""
.print "Sample Sales with Negative/Zero Prices:"
SELECT invoice_number, invoice_date, customer_code, item_code, quantity, unit_price, line_total
FROM sales
WHERE unit_price IS NOT NULL AND unit_price <= 0
LIMIT 5;

.print ""
.print "Sample Duplicate Item Codes in Catalogue:"
SELECT item_code, ie_trade, ie_high, ie_mid, ie_low
FROM catalogue_prices
WHERE item_code = 'GOHX';

.print ""
.print "Sample Empty Item Codes in Pallet Sizes:"
SELECT item_code, pallet_quantity, description
FROM pallet_sizes
WHERE item_code IS NULL OR item_code = ''
LIMIT 5;

.print ""
.print "Sample Customer Name Variations:"
SELECT customer_code, customer_name, COUNT(*) as occurrences
FROM sales
WHERE customer_code = 'AMP01'
GROUP BY customer_code, customer_name;

.print ""
.print "Total Records Per Table:"
SELECT 'sales' as table_name, COUNT(*) as count FROM sales
UNION ALL
SELECT 'catalogue_prices', COUNT(*) FROM catalogue_prices
UNION ALL
SELECT 'landed_costs', COUNT(*) FROM landed_costs
UNION ALL
SELECT 'customer_product_keys', COUNT(*) FROM customer_product_keys
UNION ALL
SELECT 'pallet_sizes', COUNT(*) FROM pallet_sizes;

