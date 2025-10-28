import { getDb, getDefaultDateRange } from '../database';

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

/**
 * Get product performance metrics
 */
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
      SUM(s.quantity) as quantity_sold,
      ROUND(SUM(s.line_total), 2) as revenue,
      ROUND(SUM(s.quantity * COALESCE(lc.landed_cost_euro, 0)), 2) as cost,
      ROUND(SUM(s.line_total - (s.quantity * COALESCE(lc.landed_cost_euro, 0))), 2) as margin,
      ROUND(
        (SUM(s.line_total - (s.quantity * COALESCE(lc.landed_cost_euro, 0))) / 
         NULLIF(SUM(s.quantity * COALESCE(lc.landed_cost_euro, 1)), 0)) * 100,
        2
      ) as margin_percent,
      COUNT(DISTINCT s.customer_code) as unique_customers,
      COUNT(*) as transaction_count,
      ROUND(AVG(s.quantity), 2) as avg_order_quantity
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

