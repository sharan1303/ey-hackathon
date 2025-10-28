import { getDb, getDefaultDateRange } from '../database';

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

/**
 * Get products with negative margins (sold below cost)
 */
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
      SUM(s.quantity) as total_quantity_sold,
      ROUND(SUM(s.line_total), 2) as total_revenue,
      ROUND(SUM(s.quantity * lc.landed_cost_euro), 2) as total_cost,
      ROUND(SUM(s.line_total - (s.quantity * lc.landed_cost_euro)), 2) as total_margin,
      ROUND(
        (SUM(s.line_total - (s.quantity * lc.landed_cost_euro)) / 
         NULLIF(SUM(s.quantity * lc.landed_cost_euro), 0)) * 100,
        2
      ) as margin_percent,
      ROUND(AVG(s.unit_price), 2) as avg_selling_price,
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

