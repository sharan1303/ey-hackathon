-- Voltura Group Database Schema
-- SQLite Database for importing CSV and Excel data

-- ============================================================================
-- Table: catalogue_prices
-- Description: Product catalogue with various price tiers
-- Source: voltura_group_catalogue_price.csv
-- ============================================================================
CREATE TABLE IF NOT EXISTS catalogue_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_code TEXT NOT NULL,
    ie_trade REAL,
    ie_high REAL,
    ie_mid REAL,
    ie_low REAL,
    ie_base REAL,
    ie_edm REAL,
    ie_anew REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_catalogue_item_code ON catalogue_prices (item_code);

-- ============================================================================
-- Table: landed_costs
-- Description: Product landed costs in Euro with 5% markup
-- Source: voltura_group_landed_cost_july.csv
-- ============================================================================
CREATE TABLE IF NOT EXISTS landed_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_code TEXT NOT NULL,
    landed_cost_euro REAL,
    plus_5_percent REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_landed_item_code ON landed_costs (item_code);

-- ============================================================================
-- Table: sales
-- Description: Sales transaction records with customer and product details
-- Source: voltura_group_sales.csv
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_code TEXT,
    customer_name TEXT,
    region TEXT,
    invoice_number TEXT,
    document_type TEXT,
    invoice_date TEXT,
    item_code TEXT,
    item_description TEXT,
    quantity INTEGER,
    currency TEXT,
    unit_price REAL,
    line_total REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_item_code ON sales (item_code);

CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales (customer_code);

CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales (invoice_number);

CREATE INDEX IF NOT EXISTS idx_sales_date ON sales (invoice_date);

CREATE INDEX IF NOT EXISTS idx_sales_region ON sales (region);

CREATE INDEX IF NOT EXISTS idx_sales_document_type ON sales (document_type);

-- ============================================================================
-- Table: customer_product_keys
-- Description: Customer master data (Note: Despite the filename, this contains only customer data, not product mapping)
-- Source: Voltura Group Customer_Product Key.xlsx
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_product_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_code TEXT,
    customer_name TEXT,
    buying_group TEXT,
    region TEXT,
    account_manager TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cpk_customer ON customer_product_keys (customer_code);

CREATE INDEX IF NOT EXISTS idx_cpk_region ON customer_product_keys (region);

-- ============================================================================
-- Table: pallet_sizes
-- Description: Pallet, carton, and single unit quantity information for products
-- Source: Voltura_group_pallet_size.xlsx
-- ============================================================================
CREATE TABLE IF NOT EXISTS pallet_sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_code TEXT,
    pallet_quantity INTEGER,
    carton_quantity INTEGER,
    single_quantity INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pallet_item_code ON pallet_sizes (item_code);

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- View: Product pricing with costs
CREATE VIEW IF NOT EXISTS vw_product_pricing AS
SELECT cp.item_code, cp.ie_trade, cp.ie_high, cp.ie_mid, cp.ie_low, cp.ie_base, cp.ie_edm, cp.ie_anew, lc.landed_cost_euro, lc.plus_5_percent, ps.pallet_quantity, ps.carton_quantity, ps.single_quantity
FROM
    catalogue_prices cp
    LEFT JOIN landed_costs lc ON cp.item_code = lc.item_code
    LEFT JOIN pallet_sizes ps ON cp.item_code = ps.item_code;

-- View: Sales summary by customer
CREATE VIEW IF NOT EXISTS vw_sales_by_customer AS
SELECT
    customer_code,
    customer_name,
    COUNT(DISTINCT invoice_number) as total_invoices,
    COUNT(*) as total_line_items,
    SUM(quantity) as total_quantity,
    SUM(line_total) as total_revenue,
    AVG(line_total) as avg_line_value,
    MIN(invoice_date) as first_purchase_date,
    MAX(invoice_date) as last_purchase_date
FROM sales
WHERE
    customer_code IS NOT NULL
GROUP BY
    customer_code,
    customer_name;

-- View: Sales summary by product
CREATE VIEW IF NOT EXISTS vw_sales_by_product AS
SELECT
    s.item_code,
    COUNT(DISTINCT s.customer_code) as unique_customers,
    COUNT(DISTINCT s.invoice_number) as total_invoices,
    SUM(s.quantity) as total_quantity_sold,
    SUM(s.line_total) as total_revenue,
    AVG(s.unit_price) as avg_unit_price,
    cp.ie_trade,
    cp.ie_base,
    lc.landed_cost_euro
FROM
    sales s
    LEFT JOIN catalogue_prices cp ON s.item_code = cp.item_code
    LEFT JOIN landed_costs lc ON s.item_code = lc.item_code
WHERE
    s.item_code IS NOT NULL
GROUP BY
    s.item_code;

-- View: Monthly sales trends
CREATE VIEW IF NOT EXISTS vw_monthly_sales AS
SELECT
    strftime('%Y-%m', invoice_date) as month,
    COUNT(DISTINCT customer_code) as unique_customers,
    COUNT(DISTINCT invoice_number) as total_invoices,
    COUNT(*) as total_line_items,
    SUM(quantity) as total_quantity,
    SUM(line_total) as total_revenue,
    AVG(line_total) as avg_line_value
FROM sales
WHERE
    invoice_date IS NOT NULL
    AND invoice_date != ''
GROUP BY
    strftime('%Y-%m', invoice_date)
ORDER BY month;