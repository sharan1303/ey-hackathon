import { getDb, getDefaultDateRange } from '../../database';

export interface SalesTransaction {
  invoice_number: string;
  invoice_date: string;
  customer_code: string;
  customer_name: string;
  item_code: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  discount_percent: number;
  document_type: string;
  is_sample: number;
  is_return: number;
  landed_cost_euro: number | null;
  catalogue_price_base: number | null;
  catalogue_price_trade: number | null;
  product_description: string | null;
}

export interface SalesTransactionFilters {
  startDate?: string;
  endDate?: string;
  includeReturns?: boolean;
  includeSamples?: boolean;
  documentTypes?: string[];
  customerCode?: string;
  customerCodes?: string[];
  itemCode?: string;
  itemCodes?: string[];
  minDiscount?: number;
  maxDiscount?: number;
  limit?: number;
}

/**
 * Get raw sales transactions with all relevant joins
 * Returns individual transaction records without any calculations or aggregations
 * SQL handles filtering for performance
 */
export function getSalesTransactions(filters: SalesTransactionFilters = {}): SalesTransaction[] {
  const dateRange = filters.startDate && filters.endDate 
    ? { startDate: filters.startDate, endDate: filters.endDate } 
    : getDefaultDateRange();
  
  const {
    includeReturns = true,
    includeSamples = true,
    documentTypes = ['INV', 'CRN'],
    customerCode,
    customerCodes,
    itemCode,
    itemCodes,
    minDiscount,
    maxDiscount,
    limit
  } = filters;
  
  // Build WHERE clause conditions
  const conditions: string[] = [];
  const params: any[] = [];
  
  // Document types
  if (documentTypes.length > 0) {
    conditions.push(`s.document_type IN (${documentTypes.map(() => '?').join(', ')})`);
    params.push(...documentTypes);
  }
  
  // Date range
  conditions.push('s.invoice_date BETWEEN ? AND ?');
  params.push(dateRange.startDate, dateRange.endDate);
  
  // Sample filter
  if (!includeSamples) {
    conditions.push('s.is_sample = 0');
  }
  
  // Return filter
  if (!includeReturns) {
    conditions.push('s.is_return = 0');
  }
  
  // Customer filters
  if (customerCode) {
    conditions.push('s.customer_code = ?');
    params.push(customerCode);
  } else if (customerCodes && customerCodes.length > 0) {
    conditions.push(`s.customer_code IN (${customerCodes.map(() => '?').join(', ')})`);
    params.push(...customerCodes);
  }
  
  // Item filters
  if (itemCode) {
    conditions.push('s.item_code = ?');
    params.push(itemCode);
  } else if (itemCodes && itemCodes.length > 0) {
    conditions.push(`s.item_code IN (${itemCodes.map(() => '?').join(', ')})`);
    params.push(...itemCodes);
  }
  
  // Discount filters - calculated inline in WHERE clause
  // Formula works for both positive and negative values (returns)
  if (minDiscount !== undefined) {
    conditions.push(`
      CASE 
        WHEN cp.ie_base IS NOT NULL AND cp.ie_base > 0 AND s.quantity != 0
        THEN ((s.quantity * cp.ie_base) - s.line_total) / (s.quantity * cp.ie_base) * 100
        ELSE 0 
      END >= ?
    `);
    params.push(minDiscount);
  }
  
  if (maxDiscount !== undefined) {
    conditions.push(`
      CASE 
        WHEN cp.ie_base IS NOT NULL AND cp.ie_base > 0 AND s.quantity != 0
        THEN ((s.quantity * cp.ie_base) - s.line_total) / (s.quantity * cp.ie_base) * 100
        ELSE 0 
      END <= ?
    `);
    params.push(maxDiscount);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Build LIMIT clause
  const limitClause = limit ? `LIMIT ?` : '';
  if (limit) {
    params.push(limit);
  }
  
  const query = `
    SELECT 
      s.invoice_number,
      s.invoice_date,
      s.customer_code,
      s.customer_name,
      s.item_code,
      s.quantity,
      s.unit_price,
      s.line_total,
      CASE 
        WHEN cp.ie_base IS NOT NULL AND cp.ie_base > 0 AND s.quantity != 0
        THEN ((s.quantity * cp.ie_base) - s.line_total) / (s.quantity * cp.ie_base) * 100
        ELSE 0 
      END as discount_percent,
      s.document_type,
      s.is_sample,
      s.is_return,
      lc.landed_cost_euro,
      cp.ie_base as catalogue_price_base,
      cp.ie_trade as catalogue_price_trade,
      s.item_description as product_description
    FROM sales s
    LEFT JOIN landed_costs lc ON s.item_code = lc.item_code
    LEFT JOIN catalogue_prices cp ON s.item_code = cp.item_code
    ${whereClause}
    ORDER BY s.invoice_date DESC, s.invoice_number
    ${limitClause}
  `;
  
  const db = getDb();
  return db.prepare(query).all(...params) as SalesTransaction[];
}

