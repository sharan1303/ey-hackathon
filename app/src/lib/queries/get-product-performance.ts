import { getProductSales } from './base-queries/product-sales';
import { calculateMargin, calculateMarginPercent, calculateAverage, sortByField, limitResults } from './utils/calculations';

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

export interface ProductPerformanceFilters {
  startDate?: string;
  endDate?: string;
  sortBy?: 'revenue' | 'margin' | 'quantity' | 'margin_percent';
  limit?: number;
  order?: 'asc' | 'desc';
  minMarginPercent?: number;
  maxMarginPercent?: number;
  minRevenue?: number;
  minTransactions?: number;
}

/**
 * Get product performance metrics
 */
export function getProductPerformance(
  startDate?: string,
  endDate?: string,
  sortBy?: 'revenue' | 'margin' | 'quantity' | 'margin_percent',
  limit?: number,
  order?: 'asc' | 'desc'
): ProductPerformance[];
export function getProductPerformance(
  filters: ProductPerformanceFilters
): ProductPerformance[];
export function getProductPerformance(
  startDateOrFilters?: string | ProductPerformanceFilters,
  endDate?: string,
  sortBy: 'revenue' | 'margin' | 'quantity' | 'margin_percent' = 'revenue',
  limit = 100,
  order: 'asc' | 'desc' = 'desc'
): ProductPerformance[] {
  // Handle both function signatures
  let filters: ProductPerformanceFilters;
  if (typeof startDateOrFilters === 'object') {
    filters = startDateOrFilters;
  } else {
    filters = {
      startDate: startDateOrFilters,
      endDate,
      sortBy,
      limit,
      order
    };
  }
  
  const {
    startDate,
    endDate: filterEndDate,
    sortBy: filterSortBy = 'revenue',
    limit: filterLimit = 100,
    order: filterOrder = 'desc',
    minMarginPercent,
    maxMarginPercent,
    minRevenue,
    minTransactions
  } = filters;
  
  // Get base product sales data with SQL-level filters
  // Include returns and credit notes for accurate margin erosion calculation
  const productSales = getProductSales({
    startDate,
    endDate: filterEndDate,
    includeReturns: true,
    includeSamples: true,
    minRevenue,
    minTransactions
  });
  
  // Calculate margins and transform data
  let productsWithMetrics: ProductPerformance[] = productSales.map(product => ({
    item_code: product.item_code,
    product_description: product.product_description,
    quantity_sold: product.total_quantity,
    revenue: product.total_revenue,
    cost: product.total_cost,
    margin: calculateMargin(product.total_revenue, product.total_cost),
    margin_percent: calculateMarginPercent(product.total_revenue, product.total_cost),
    unique_customers: product.unique_customers,
    transaction_count: product.transaction_count,
    avg_order_quantity: calculateAverage(product.total_quantity, product.transaction_count)
  }));
  
  // Apply margin percent filters
  if (minMarginPercent !== undefined) {
    productsWithMetrics = productsWithMetrics.filter(p => p.margin_percent >= minMarginPercent);
  }
  if (maxMarginPercent !== undefined) {
    productsWithMetrics = productsWithMetrics.filter(p => p.margin_percent <= maxMarginPercent);
  }
  
  // Map sortBy parameter to field name
  const sortField: keyof ProductPerformance = {
    revenue: 'revenue',
    margin: 'margin',
    quantity: 'quantity_sold',
    margin_percent: 'margin_percent'
  }[filterSortBy] as keyof ProductPerformance;
  
  // Sort and limit
  const sorted = sortByField(productsWithMetrics, sortField, filterOrder);
  return limitResults(sorted, filterLimit);
}
