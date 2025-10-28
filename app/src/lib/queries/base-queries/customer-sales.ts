import { getDb, getDefaultDateRange } from '../../database';

export interface CustomerSalesData {
  customer_code: string;
  customer_name: string;
  total_quantity: number;
  total_revenue: number;
  total_cost: number;
  transaction_count: number;
  unique_products: number;
}

export interface CustomerSalesFilters {
  startDate?: string;
  endDate?: string;
  includeReturns?: boolean;
  includeSamples?: boolean;
  customerCodes?: string[];
  minRevenue?: number;
  maxRevenue?: number;
  minTransactions?: number;
  sortBy?: 'revenue' | 'cost' | 'quantity' | 'transactions';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * Get sales data aggregated by customer
 * Returns raw aggregated data without calculated fields like margin or margin_percent
 * SQL handles filtering and aggregation for performance
 */
export function getCustomerSales(filters: CustomerSalesFilters = {}): CustomerSalesData[] {
  const dateRange = filters.startDate && filters.endDate 
    ? { startDate: filters.startDate, endDate: filters.endDate } 
    : getDefaultDateRange();
  
  const {
    includeReturns = true,
    includeSamples = true,
    customerCodes,
    minRevenue,
    maxRevenue,
    minTransactions,
    sortBy,
    sortOrder = 'desc',
    limit
  } = filters;
  
  const conditions: string[] = [];
  const params: any[] = [];
  const havingConditions: string[] = [];
  
  // WHERE clause conditions - include both invoices and credit notes
  conditions.push('s.document_type IN (?, ?)');
  params.push('INV', 'CRN');
  
  if (!includeSamples) {
    conditions.push('s.is_sample = 0');
  }
  
  if (!includeReturns) {
    conditions.push('s.is_return = 0');
  }
  
  conditions.push('s.invoice_date BETWEEN ? AND ?');
  params.push(dateRange.startDate, dateRange.endDate);
  
  conditions.push('s.customer_code IS NOT NULL');
  
  if (customerCodes && customerCodes.length > 0) {
    conditions.push(`s.customer_code IN (${customerCodes.map(() => '?').join(', ')})`);
    params.push(...customerCodes);
  }
  
  // HAVING clause conditions (after aggregation)
  if (minRevenue !== undefined) {
    havingConditions.push('total_revenue >= ?');
    params.push(minRevenue);
  }
  
  if (maxRevenue !== undefined) {
    havingConditions.push('total_revenue <= ?');
    params.push(maxRevenue);
  }
  
  if (minTransactions !== undefined) {
    havingConditions.push('transaction_count >= ?');
    params.push(minTransactions);
  }
  
  // Build ORDER BY clause
  let orderByClause = '';
  if (sortBy) {
    const sortColumn = {
      revenue: 'total_revenue',
      cost: 'total_cost',
      quantity: 'total_quantity',
      transactions: 'transaction_count'
    }[sortBy];
    orderByClause = `ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
  }
  
  // Build LIMIT clause
  const limitClause = limit ? `LIMIT ?` : '';
  if (limit) {
    params.push(limit);
  }
  
  const query = `
    SELECT 
      s.customer_code,
      s.customer_name,
      SUM(s.quantity) as total_quantity,
      SUM(s.line_total) as total_revenue,
      SUM(s.quantity * COALESCE(lc.landed_cost_euro, 0)) as total_cost,
      COUNT(*) as transaction_count,
      COUNT(DISTINCT s.item_code) as unique_products
    FROM sales s
    LEFT JOIN landed_costs lc ON s.item_code = lc.item_code
    WHERE ${conditions.join(' AND ')}
    GROUP BY s.customer_code, s.customer_name
    ${havingConditions.length > 0 ? 'HAVING ' + havingConditions.join(' AND ') : ''}
    ${orderByClause}
    ${limitClause}
  `;
  
  const db = getDb();
  return db.prepare(query).all(...params) as CustomerSalesData[];
}

