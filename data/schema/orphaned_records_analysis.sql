-- ============================================================================
-- Orphaned Records Analysis
-- Description: Find sales items that don't exist in the catalogue
-- Date: 2025-10-27
-- ============================================================================

-- SUMMARY STATISTICS
-- Total orphaned item codes: 2,968
-- Total orphaned sales transactions: 283,284
-- Total quantity sold: 3,616,555 units
-- Total revenue impact: €47,476,321.79
-- This represents items that were sold but have no catalogue price reference!

-- ============================================================================
-- Query 1: Summary of all orphaned records
-- ============================================================================
SELECT
    COUNT(DISTINCT s.item_code) as orphaned_items,
    COUNT(*) as total_orphaned_sales,
    SUM(s.quantity) as total_quantity,
    ROUND(SUM(s.line_total), 2) as total_revenue
FROM sales s
    LEFT JOIN catalogue_prices cp ON s.item_code = cp.item_code
WHERE
    cp.item_code IS NULL
    AND s.item_code IS NOT NULL;

-- ============================================================================
-- Query 2: Top 20 orphaned items by sales count
-- ============================================================================
SELECT
    s.item_code,
    COUNT(*) as sales_count,
    COUNT(DISTINCT s.customer_code) as unique_customers,
    COUNT(DISTINCT s.invoice_number) as invoice_count,
    SUM(s.quantity) as total_quantity,
    ROUND(SUM(s.line_total), 2) as total_revenue,
    ROUND(AVG(s.unit_price), 2) as avg_unit_price,
    MIN(s.invoice_date) as first_sale,
    MAX(s.invoice_date) as last_sale
FROM sales s
    LEFT JOIN catalogue_prices cp ON s.item_code = cp.item_code
WHERE
    cp.item_code IS NULL
    AND s.item_code IS NOT NULL
GROUP BY
    s.item_code
ORDER BY sales_count DESC
LIMIT 20;

-- ============================================================================
-- Query 3: Orphaned items with negative revenue (potential data issues)
-- ============================================================================
SELECT
    s.item_code,
    COUNT(*) as sales_count,
    SUM(s.quantity) as total_quantity,
    ROUND(SUM(s.line_total), 2) as total_revenue,
    ROUND(AVG(s.unit_price), 2) as avg_unit_price
FROM sales s
    LEFT JOIN catalogue_prices cp ON s.item_code = cp.item_code
WHERE
    cp.item_code IS NULL
    AND s.item_code IS NOT NULL
    AND s.line_total < 0
GROUP BY
    s.item_code
ORDER BY total_revenue ASC
LIMIT 20;

-- ============================================================================
-- Query 4: Orphaned records by customer
-- ============================================================================
SELECT
    s.customer_code,
    s.customer_name,
    COUNT(DISTINCT s.item_code) as orphaned_items_purchased,
    COUNT(*) as orphaned_sales_count,
    ROUND(SUM(s.line_total), 2) as total_revenue
FROM sales s
    LEFT JOIN catalogue_prices cp ON s.item_code = cp.item_code
WHERE
    cp.item_code IS NULL
    AND s.item_code IS NOT NULL
GROUP BY
    s.customer_code,
    s.customer_name
ORDER BY orphaned_sales_count DESC
LIMIT 20;

-- ============================================================================
-- Query 5: Monthly trend of orphaned sales
-- ============================================================================
SELECT
    strftime ('%Y-%m', s.invoice_date) as month,
    COUNT(DISTINCT s.item_code) as unique_orphaned_items,
    COUNT(*) as orphaned_sales_count,
    SUM(s.quantity) as total_quantity,
    ROUND(SUM(s.line_total), 2) as total_revenue
FROM sales s
    LEFT JOIN catalogue_prices cp ON s.item_code = cp.item_code
WHERE
    cp.item_code IS NULL
    AND s.item_code IS NOT NULL
    AND s.invoice_date IS NOT NULL
    AND s.invoice_date != ''
GROUP BY
    strftime ('%Y-%m', s.invoice_date)
ORDER BY month;

-- ============================================================================
-- Query 6: Items in catalogue but never sold (the opposite problem)
-- ============================================================================
SELECT cp.item_code, cp.ie_trade, cp.ie_high, cp.ie_mid, cp.ie_low
FROM catalogue_prices cp
    LEFT JOIN sales s ON cp.item_code = s.item_code
WHERE
    s.item_code IS NULL
LIMIT 50;

-- ============================================================================
-- RECOMMENDATIONS:
-- ============================================================================
-- 1. HIGH PRIORITY: Investigate the top 20 orphaned items (11K+ transactions for IEZ8487-KHF alone)
-- 2. Add missing items to catalogue_prices table with appropriate pricing tiers
-- 3. Review items with negative revenue (ZNVMWNVMG: -€3.8M) - likely returns/credits
-- 4. Consider implementing referential integrity constraints to prevent future orphaned records
-- 5. Investigate if these are:
--    - Discontinued products that need to be added to catalogue
--    - Misspelled/incorrect item codes that need correction
--    - Special order items that bypass normal catalogue
--    - Legacy items from system migration
-- ============================================================================