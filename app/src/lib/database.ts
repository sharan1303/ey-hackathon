import Database from 'better-sqlite3';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection - use the canonical database in the data folder
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../../data/voltura_data_cleaned.db');
let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
  }
  return db;
}

// Helper to format dates for SQL
function formatDateForSQL(date?: string): string | null {
  if (!date) return null;
  // Assume ISO format YYYY-MM-DD
  return date;
}

// Helper to get default date range (last 12 months)
function getDefaultDateRange(): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

// ============================================================================
// PHASE 1: CRITICAL FUNCTIONS
// ============================================================================

/**
 * 1. Get customers with negative margins (selling below cost)
 */
export interface NegativeMarginCustomer {
  customer_code: string;
  customer_name: string;
  total_revenue: number;
  total_cost: number;
  total_margin: number;
  margin_percent: number;
  transaction_count: number;
  items_sold: number;
}

export function getNegativeMarginsByCustomer(
  startDate?: string,
  endDate?: string,
  includeReturns = false
): NegativeMarginCustomer[] {
  const dateRange = startDate && endDate ? { startDate, endDate } : getDefaultDateRange();
  
  const query = `
    SELECT 
      s.customer_code,
      s.customer_name_standardized as customer_name,
      ROUND(SUM(s.line_total), 2) as total_revenue,
      ROUND(SUM(s.quantity_corrected * lc.landed_cost_euro), 2) as total_cost,
      ROUND(SUM(s.line_total - (s.quantity_corrected * lc.landed_cost_euro)), 2) as total_margin,
      ROUND(
        (SUM(s.line_total - (s.quantity_corrected * lc.landed_cost_euro)) / 
         NULLIF(SUM(s.quantity_corrected * lc.landed_cost_euro), 0)) * 100, 
        2
      ) as margin_percent,
      COUNT(*) as transaction_count,
      SUM(s.quantity_corrected) as items_sold
    FROM sales s
    JOIN landed_costs lc ON s.item_code = lc.item_code
    WHERE s.document_type = 'INV' 
      AND s.is_sample = 0
      ${includeReturns ? '' : 'AND s.is_return = 0'}
      AND s.invoice_date BETWEEN ? AND ?
      AND s.customer_code IS NOT NULL
    GROUP BY s.customer_code, s.customer_name_standardized
    HAVING total_margin < 0
    ORDER BY total_margin ASC
  `;
  
  const db = getDb();
  return db.prepare(query).all(dateRange.startDate, dateRange.endDate) as NegativeMarginCustomer[];
}

/**
 * 2. Get products with negative margins (sold below cost)
 */
export interface NegativeMarginProduct {
  item_code: string;
  product_description: string;
  total_quantity_sold: number;
  total_revenue: number;
  total_cost: number;
  total_margin: number;
  margin_percent: number;
  avg_selling_price: number;
  landed_cost: number;
  catalogue_price_trade: number | null;
  transaction_count: number;
  unique_customers: number;
}

export function getNegativeMarginsBySKU(
  startDate?: string,
  endDate?: string,
  minTransactions = 5
): NegativeMarginProduct[] {
  const dateRange = startDate && endDate ? { startDate, endDate } : getDefaultDateRange();
  
  const query = `
    SELECT 
      s.item_code,
      COALESCE(cpk.product_description, ps.description, 'Unknown') as product_description,
      SUM(s.quantity_corrected) as total_quantity_sold,
      ROUND(SUM(s.line_total), 2) as total_revenue,
      ROUND(SUM(s.quantity_corrected * lc.landed_cost_euro), 2) as total_cost,
      ROUND(SUM(s.line_total - (s.quantity_corrected * lc.landed_cost_euro)), 2) as total_margin,
      ROUND(
        (SUM(s.line_total - (s.quantity_corrected * lc.landed_cost_euro)) / 
         NULLIF(SUM(s.quantity_corrected * lc.landed_cost_euro), 0)) * 100,
        2
      ) as margin_percent,
      ROUND(AVG(s.unit_price_corrected), 2) as avg_selling_price,
      ROUND(lc.landed_cost_euro, 2) as landed_cost,
      cp.ie_trade as catalogue_price_trade,
      COUNT(*) as transaction_count,
      COUNT(DISTINCT s.customer_code) as unique_customers
    FROM sales s
    JOIN landed_costs lc ON s.item_code = lc.item_code
    LEFT JOIN catalogue_prices cp ON s.item_code = cp.item_code
    LEFT JOIN customer_product_keys cpk ON s.item_code = cpk.item_code
    LEFT JOIN pallet_sizes ps ON s.item_code = ps.item_code
    WHERE s.document_type = 'INV' 
      AND s.is_sample = 0
      AND s.is_return = 0
      AND s.invoice_date BETWEEN ? AND ?
    GROUP BY s.item_code, lc.landed_cost_euro, cp.ie_trade
    HAVING total_margin < 0 AND transaction_count >= ?
    ORDER BY total_margin ASC
  `;
  
  const db = getDb();
  return db.prepare(query).all(dateRange.startDate, dateRange.endDate, minTransactions) as NegativeMarginProduct[];
}

/**
 * 3. Get customer profitability ranking
 */
export interface CustomerProfitability {
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
}

export function getCustomerProfitability(
  startDate?: string,
  endDate?: string,
  includeReturns = false,
  sortBy: 'margin' | 'revenue' | 'margin_percent' = 'margin',
  limit = 100,
  order: 'asc' | 'desc' = 'desc'
): CustomerProfitability[] {
  const dateRange = startDate && endDate ? { startDate, endDate } : getDefaultDateRange();
  
  const sortColumn = {
    margin: 'gross_margin',
    revenue: 'total_revenue',
    margin_percent: 'margin_percent'
  }[sortBy];
  
  const sortOrder = order.toUpperCase();
  
  const query = `
    SELECT 
      s.customer_code,
      s.customer_name_standardized as customer_name,
      ROUND(SUM(s.line_total), 2) as total_revenue,
      ROUND(SUM(s.quantity_corrected * COALESCE(lc.landed_cost_euro, 0)), 2) as total_cost,
      ROUND(SUM(s.line_total - (s.quantity_corrected * COALESCE(lc.landed_cost_euro, 0))), 2) as gross_margin,
      ROUND(
        (SUM(s.line_total - (s.quantity_corrected * COALESCE(lc.landed_cost_euro, 0))) / 
         NULLIF(SUM(s.quantity_corrected * COALESCE(lc.landed_cost_euro, 1)), 0)) * 100,
        2
      ) as margin_percent,
      COUNT(*) as transaction_count,
      COUNT(DISTINCT s.item_code) as unique_products,
      ROUND(AVG(s.line_total), 2) as avg_order_value,
      SUM(s.quantity_corrected) as total_quantity
    FROM sales s
    LEFT JOIN landed_costs lc ON s.item_code = lc.item_code
    WHERE s.document_type = 'INV' 
      AND s.is_sample = 0
      ${includeReturns ? '' : 'AND s.is_return = 0'}
      AND s.invoice_date BETWEEN ? AND ?
      AND s.customer_code IS NOT NULL
    GROUP BY s.customer_code, s.customer_name_standardized
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT ?
  `;
  
  const db = getDb();
  return db.prepare(query).all(dateRange.startDate, dateRange.endDate, limit) as CustomerProfitability[];
}

/**
 * 4. Get product performance metrics
 */
export interface ProductPerformance {
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
}

export function getProductPerformance(
  startDate?: string,
  endDate?: string,
  sortBy: 'revenue' | 'margin' | 'quantity' | 'margin_percent' = 'revenue',
  limit = 100,
  order: 'asc' | 'desc' = 'desc'
): ProductPerformance[] {
  const dateRange = startDate && endDate ? { startDate, endDate } : getDefaultDateRange();
  
  const sortColumn = {
    revenue: 'revenue',
    margin: 'margin',
    quantity: 'quantity_sold',
    margin_percent: 'margin_percent'
  }[sortBy];
  
  const sortOrder = order.toUpperCase();
  
  const query = `
    SELECT 
      s.item_code,
      COALESCE(cpk.product_description, ps.description, 'Unknown') as product_description,
      SUM(s.quantity_corrected) as quantity_sold,
      ROUND(SUM(s.line_total), 2) as revenue,
      ROUND(SUM(s.quantity_corrected * COALESCE(lc.landed_cost_euro, 0)), 2) as cost,
      ROUND(SUM(s.line_total - (s.quantity_corrected * COALESCE(lc.landed_cost_euro, 0))), 2) as margin,
      ROUND(
        (SUM(s.line_total - (s.quantity_corrected * COALESCE(lc.landed_cost_euro, 0))) / 
         NULLIF(SUM(s.quantity_corrected * COALESCE(lc.landed_cost_euro, 1)), 0)) * 100,
        2
      ) as margin_percent,
      COUNT(DISTINCT s.customer_code) as unique_customers,
      COUNT(*) as transaction_count,
      ROUND(AVG(s.quantity_corrected), 2) as avg_order_quantity
    FROM sales s
    LEFT JOIN landed_costs lc ON s.item_code = lc.item_code
    LEFT JOIN customer_product_keys cpk ON s.item_code = cpk.item_code
    LEFT JOIN pallet_sizes ps ON s.item_code = ps.item_code
    WHERE s.document_type = 'INV' 
      AND s.is_sample = 0
      AND s.is_return = 0
      AND s.invoice_date BETWEEN ? AND ?
    GROUP BY s.item_code
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT ?
  `;
  
  const db = getDb();
  return db.prepare(query).all(dateRange.startDate, dateRange.endDate, limit) as ProductPerformance[];
}

/**
 * 5. Get executive dashboard with high-level KPIs
 */
export interface ExecutiveDashboard {
  total_revenue: number;
  total_cost: number;
  gross_margin: number;
  gross_margin_percent: number;
  transaction_count: number;
  unique_customers: number;
  unique_products: number;
  avg_order_value: number;
  top_10_customer_concentration_percent: number;
  negative_margin_customers_count: number;
  negative_margin_amount: number;
  return_rate_percent: number;
  avg_discount_percent: number;
}

export function getExecutiveDashboard(
  startDate?: string,
  endDate?: string
): ExecutiveDashboard {
  const dateRange = startDate && endDate ? { startDate, endDate } : getDefaultDateRange();
  const db = getDb();
  
  // Main metrics
  const mainQuery = `
    SELECT 
      ROUND(SUM(s.line_total), 2) as total_revenue,
      ROUND(SUM(s.quantity_corrected * COALESCE(lc.landed_cost_euro, 0)), 2) as total_cost,
      ROUND(SUM(s.line_total - (s.quantity_corrected * COALESCE(lc.landed_cost_euro, 0))), 2) as gross_margin,
      ROUND(
        (SUM(s.line_total - (s.quantity_corrected * COALESCE(lc.landed_cost_euro, 0))) / 
         NULLIF(SUM(s.quantity_corrected * COALESCE(lc.landed_cost_euro, 1)), 0)) * 100,
        2
      ) as gross_margin_percent,
      COUNT(*) as transaction_count,
      COUNT(DISTINCT s.customer_code) as unique_customers,
      COUNT(DISTINCT s.item_code) as unique_products,
      ROUND(AVG(s.line_total), 2) as avg_order_value,
      ROUND(AVG(s.discount_percent), 2) as avg_discount_percent
    FROM sales s
    LEFT JOIN landed_costs lc ON s.item_code = lc.item_code
    WHERE s.document_type = 'INV' 
      AND s.is_sample = 0
      AND s.is_return = 0
      AND s.invoice_date BETWEEN ? AND ?
  `;
  
  const main = db.prepare(mainQuery).get(dateRange.startDate, dateRange.endDate) as any;
  
  // Top 10 customer concentration
  const concentrationQuery = `
    SELECT 
      ROUND((SUM(line_total) * 100.0 / (
        SELECT SUM(line_total) 
        FROM sales 
        WHERE document_type = 'INV' 
          AND is_sample = 0 
          AND is_return = 0
          AND invoice_date BETWEEN ? AND ?
      )), 2) as concentration_percent
    FROM (
      SELECT SUM(line_total) as line_total
      FROM sales
      WHERE document_type = 'INV' 
        AND is_sample = 0
        AND is_return = 0
        AND invoice_date BETWEEN ? AND ?
      GROUP BY customer_code
      ORDER BY line_total DESC
      LIMIT 10
    )
  `;
  
  const concentration = db.prepare(concentrationQuery).get(
    dateRange.startDate, dateRange.endDate,
    dateRange.startDate, dateRange.endDate
  ) as any;
  
  // Negative margin metrics
  const negativeMargins = getNegativeMarginsByCustomer(startDate, endDate, false);
  const negative_margin_customers_count = negativeMargins.length;
  const negative_margin_amount = negativeMargins.reduce((sum, c) => sum + c.total_margin, 0);
  
  // Return rate
  const returnQuery = `
    SELECT 
      ROUND(
        (SUM(CASE WHEN is_return = 1 THEN ABS(line_total) ELSE 0 END) * 100.0 / 
         NULLIF(SUM(CASE WHEN is_return = 0 THEN line_total ELSE 0 END), 0)),
        2
      ) as return_rate_percent
    FROM sales
    WHERE document_type IN ('INV', 'CN')
      AND is_sample = 0
      AND invoice_date BETWEEN ? AND ?
  `;
  
  const returnRate = db.prepare(returnQuery).get(dateRange.startDate, dateRange.endDate) as any;
  
  return {
    ...main,
    top_10_customer_concentration_percent: concentration?.concentration_percent || 0,
    negative_margin_customers_count,
    negative_margin_amount: Math.round(negative_margin_amount * 100) / 100,
    return_rate_percent: returnRate?.return_rate_percent || 0
  };
}

/**
 * 6. Get problem areas report
 */
export interface ProblemAreasReport {
  negative_margin_customers: Array<{ customer_code: string; customer_name: string; margin: number }>;
  negative_margin_products: Array<{ item_code: string; product_description: string; margin: number }>;
  high_discount_transactions: Array<{ 
    invoice_number: string; 
    customer_code: string; 
    item_code: string; 
    discount_percent: number;
    margin: number;
  }>;
  inactive_high_value_customers: Array<{ 
    customer_code: string; 
    customer_name: string;
    days_inactive: number;
    lifetime_revenue: number;
  }>;
}

export function getProblemAreasReport(
  startDate?: string,
  endDate?: string
): ProblemAreasReport {
  const dateRange = startDate && endDate ? { startDate, endDate } : getDefaultDateRange();
  const db = getDb();
  
  // Top 10 negative margin customers
  const negativeCustomers = getNegativeMarginsByCustomer(startDate, endDate, false)
    .slice(0, 10)
    .map(c => ({
      customer_code: c.customer_code,
      customer_name: c.customer_name,
      margin: c.total_margin
    }));
  
  // Top 10 negative margin products
  const negativeProducts = getNegativeMarginsBySKU(startDate, endDate, 1)
    .slice(0, 10)
    .map(p => ({
      item_code: p.item_code,
      product_description: p.product_description,
      margin: p.total_margin
    }));
  
  // High discount transactions (>20%)
  const highDiscountQuery = `
    SELECT 
      invoice_number,
      customer_code,
      item_code,
      discount_percent,
      ROUND(line_total - (quantity_corrected * COALESCE(lc.landed_cost_euro, 0)), 2) as margin
    FROM sales s
    LEFT JOIN landed_costs lc ON s.item_code = lc.item_code
    WHERE document_type = 'INV'
      AND is_sample = 0
      AND is_return = 0
      AND discount_percent > 20
      AND invoice_date BETWEEN ? AND ?
    ORDER BY discount_percent DESC
    LIMIT 10
  `;
  
  const highDiscounts = db.prepare(highDiscountQuery).all(dateRange.startDate, dateRange.endDate) as any[];
  
  // Inactive high-value customers (>90 days no purchase, >€10k lifetime)
  const inactiveQuery = `
    SELECT 
      customer_code,
      customer_name_standardized as customer_name,
      CAST(julianday('now') - julianday(MAX(invoice_date)) AS INTEGER) as days_inactive,
      ROUND(SUM(line_total), 2) as lifetime_revenue
    FROM sales
    WHERE document_type = 'INV'
      AND is_sample = 0
      AND is_return = 0
    GROUP BY customer_code, customer_name_standardized
    HAVING days_inactive > 90 AND lifetime_revenue > 10000
    ORDER BY lifetime_revenue DESC
    LIMIT 10
  `;
  
  const inactiveCustomers = db.prepare(inactiveQuery).all() as any[];
  
  return {
    negative_margin_customers: negativeCustomers,
    negative_margin_products: negativeProducts,
    high_discount_transactions: highDiscounts,
    inactive_high_value_customers: inactiveCustomers
  };
}

// Close database on process exit
process.on('exit', () => {
  if (db) {
    db.close();
  }
});

