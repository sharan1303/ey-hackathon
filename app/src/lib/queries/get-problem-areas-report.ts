import { getDb, getDefaultDateRange } from '../database';
import { getNegativeMarginsByCustomer } from './get-negative-margins-by-customer';
import { getNegativeMarginsBySKU } from './get-negative-margins-by-sku';

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

/**
 * Get problem areas report
 */
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
      ROUND(line_total - (quantity * COALESCE(lc.landed_cost_euro, 0)), 2) as margin
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
      customer_name,
      CAST(julianday('now') - julianday(MAX(invoice_date)) AS INTEGER) as days_inactive,
      ROUND(SUM(line_total), 2) as lifetime_revenue
    FROM sales
    WHERE document_type = 'INV'
      AND is_sample = 0
      AND is_return = 0
    GROUP BY customer_code, customer_name
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

