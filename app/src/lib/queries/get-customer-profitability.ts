import { getDb, getDefaultDateRange } from '../database';

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

/**
 * Get customer profitability ranking
 */
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
      s.customer_name,
      ROUND(SUM(s.line_total), 2) as total_revenue,
      ROUND(SUM(s.quantity * COALESCE(lc.landed_cost_euro, 0)), 2) as total_cost,
      ROUND(SUM(s.line_total - (s.quantity * COALESCE(lc.landed_cost_euro, 0))), 2) as gross_margin,
      ROUND(
        (SUM(s.line_total - (s.quantity * COALESCE(lc.landed_cost_euro, 0))) / 
         NULLIF(SUM(s.quantity * COALESCE(lc.landed_cost_euro, 1)), 0)) * 100,
        2
      ) as margin_percent,
      COUNT(*) as transaction_count,
      COUNT(DISTINCT s.item_code) as unique_products,
      ROUND(AVG(s.line_total), 2) as avg_order_value,
      SUM(s.quantity) as total_quantity
    FROM sales s
    LEFT JOIN landed_costs lc ON s.item_code = lc.item_code
    WHERE s.document_type = 'INV' 
      AND s.is_sample = 0
      ${includeReturns ? '' : 'AND s.is_return = 0'}
      AND s.invoice_date BETWEEN ? AND ?
      AND s.customer_code IS NOT NULL
    GROUP BY s.customer_code, s.customer_name
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT ?
  `;
  
  const db = getDb();
  return db.prepare(query).all(dateRange.startDate, dateRange.endDate, limit) as CustomerProfitability[];
}

