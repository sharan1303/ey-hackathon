import { getDb, getDefaultDateRange } from '../../database';

export interface ProductSalesData {
  item_code: string;
  product_description: string;
  total_quantity: number;
  total_revenue: number;
  total_cost: number;
  transaction_count: number;
  unique_customers: number;
  landed_cost_euro: number | null;
  catalogue_price_trade: number | null;
}

export interface ProductSalesFilters {
  startDate?: string;
  endDate?: string;
  includeReturns?: boolean;
  includeSamples?: boolean;
  itemCodes?: string[];
  minRevenue?: number;
  maxRevenue?: number;
  minQuantity?: number;
  minTransactions?: number;
  sortBy?: 'revenue' | 'cost' | 'quantity' | 'transactions';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * Get sales data aggregated by product
 * Returns raw aggregated data without calculated fields like margin or margin_percent
 * SQL handles filtering and aggregation for performance
 */
export function getProductSales(filters: ProductSalesFilters = {}): ProductSalesData[] {
  const dateRange = filters.startDate && filters.endDate 
    ? { startDate: filters.startDate, endDate: filters.endDate } 
    : getDefaultDateRange();
  
  const {
    includeReturns = true,
    includeSamples = true,
    itemCodes,
    minRevenue,
    maxRevenue,
    minQuantity,
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
  
  if (itemCodes && itemCodes.length > 0) {
    conditions.push(`s.item_code IN (${itemCodes.map(() => '?').join(', ')})`);
    params.push(...itemCodes);
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
  
  if (minQuantity !== undefined) {
    havingConditions.push('total_quantity >= ?');
    params.push(minQuantity);
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
      s.item_code,
      COALESCE(MAX(s.item_description), 'Unknown') as product_description,
      SUM(s.quantity) as total_quantity,
      SUM(s.line_total) as total_revenue,
      SUM(s.quantity * COALESCE(lc.landed_cost_euro, 0)) as total_cost,
      COUNT(*) as transaction_count,
      COUNT(DISTINCT s.customer_code) as unique_customers,
      lc.landed_cost_euro,
      cp.ie_trade as catalogue_price_trade
    FROM sales s
    LEFT JOIN landed_costs lc ON s.item_code = lc.item_code
    LEFT JOIN catalogue_prices cp ON s.item_code = cp.item_code
    WHERE ${conditions.join(' AND ')}
    GROUP BY s.item_code, lc.landed_cost_euro, cp.ie_trade
    ${havingConditions.length > 0 ? 'HAVING ' + havingConditions.join(' AND ') : ''}
    ${orderByClause}
    ${limitClause}
  `;
  
  const db = getDb();
  return db.prepare(query).all(...params) as ProductSalesData[];
}

