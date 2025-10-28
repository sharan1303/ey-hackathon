import { getDb, getDefaultDateRange } from '../database';
import { getNegativeMarginsByCustomer } from './get-negative-margins-by-customer';

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

/**
 * Get executive dashboard with high-level KPIs
 */
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
      ROUND(SUM(s.quantity * COALESCE(lc.landed_cost_euro, 0)), 2) as total_cost,
      ROUND(SUM(s.line_total - (s.quantity * COALESCE(lc.landed_cost_euro, 0))), 2) as gross_margin,
      ROUND(
        (SUM(s.line_total - (s.quantity * COALESCE(lc.landed_cost_euro, 0))) / 
         NULLIF(SUM(s.quantity * COALESCE(lc.landed_cost_euro, 1)), 0)) * 100,
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

