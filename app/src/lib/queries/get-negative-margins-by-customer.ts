import { getDb, getDefaultDateRange } from '../database';

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

/**
 * Get customers with negative margins (selling below cost)
 */
export function getNegativeMarginsByCustomer(
  startDate?: string,
  endDate?: string,
  includeReturns = false
): NegativeMarginCustomer[] {
  const dateRange = startDate && endDate ? { startDate, endDate } : getDefaultDateRange();
  
  const query = `
    SELECT 
      s.customer_code,
      s.customer_name,
      ROUND(SUM(s.line_total), 2) as total_revenue,
      ROUND(SUM(s.quantity * lc.landed_cost_euro), 2) as total_cost,
      ROUND(SUM(s.line_total - (s.quantity * lc.landed_cost_euro)), 2) as total_margin,
      ROUND(
        (SUM(s.line_total - (s.quantity * lc.landed_cost_euro)) / 
         NULLIF(SUM(s.quantity * lc.landed_cost_euro), 0)) * 100, 
        2
      ) as margin_percent,
      COUNT(*) as transaction_count,
      SUM(s.quantity) as items_sold
    FROM sales s
    JOIN landed_costs lc ON s.item_code = lc.item_code
    WHERE s.document_type = 'INV' 
      AND s.is_sample = 0
      ${includeReturns ? '' : 'AND s.is_return = 0'}
      AND s.invoice_date BETWEEN ? AND ?
      AND s.customer_code IS NOT NULL
    GROUP BY s.customer_code, s.customer_name
    HAVING total_margin < 0
    ORDER BY total_margin ASC
  `;
  
  const db = getDb();
  return db.prepare(query).all(dateRange.startDate, dateRange.endDate) as NegativeMarginCustomer[];
}

