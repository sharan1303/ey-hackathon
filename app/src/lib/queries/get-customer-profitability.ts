import { getCustomerSales } from './base-queries/customer-sales';
import { calculateMargin, calculateMarginPercent, calculateAverage, sortByField, limitResults } from './utils/calculations';

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

export interface CustomerProfitabilityFilters {
  startDate?: string;
  endDate?: string;
  includeReturns?: boolean;
  sortBy?: 'margin' | 'revenue' | 'margin_percent';
  limit?: number;
  order?: 'asc' | 'desc';
  minMarginPercent?: number;
  maxMarginPercent?: number;
  minRevenue?: number;
  minTransactions?: number;
}

/**
 * Get customer profitability ranking
 */
export function getCustomerProfitability(
  startDate?: string,
  endDate?: string,
  includeReturns?: boolean,
  sortBy?: 'margin' | 'revenue' | 'margin_percent',
  limit?: number,
  order?: 'asc' | 'desc'
): CustomerProfitability[];
export function getCustomerProfitability(
  filters: CustomerProfitabilityFilters
): CustomerProfitability[];
export function getCustomerProfitability(
  startDateOrFilters?: string | CustomerProfitabilityFilters,
  endDate?: string,
  includeReturns = false,
  sortBy: 'margin' | 'revenue' | 'margin_percent' = 'margin',
  limit = 100,
  order: 'asc' | 'desc' = 'desc'
): CustomerProfitability[] {
  // Handle both function signatures
  let filters: CustomerProfitabilityFilters;
  if (typeof startDateOrFilters === 'object') {
    filters = startDateOrFilters;
  } else {
    filters = {
      startDate: startDateOrFilters,
      endDate,
      includeReturns,
      sortBy,
      limit,
      order
    };
  }
  
  const {
    startDate,
    endDate: filterEndDate,
    includeReturns: filterReturns = false,
    sortBy: filterSortBy = 'margin',
    limit: filterLimit = 100,
    order: filterOrder = 'desc',
    minMarginPercent,
    maxMarginPercent,
    minRevenue,
    minTransactions
  } = filters;
  
  // Get base customer sales data with SQL-level filters
  const customerSales = getCustomerSales({
    startDate,
    endDate: filterEndDate,
    includeReturns: filterReturns,
    includeSamples: false,
    minRevenue,
    minTransactions
  });
  
  // Calculate margins and transform data
  let customersWithMetrics: CustomerProfitability[] = customerSales.map(customer => ({
    customer_code: customer.customer_code,
    customer_name: customer.customer_name,
    total_revenue: customer.total_revenue,
    total_cost: customer.total_cost,
    gross_margin: calculateMargin(customer.total_revenue, customer.total_cost),
    margin_percent: calculateMarginPercent(customer.total_revenue, customer.total_cost),
    transaction_count: customer.transaction_count,
    unique_products: customer.unique_products,
    avg_order_value: calculateAverage(customer.total_revenue, customer.transaction_count),
    total_quantity: customer.total_quantity
  }));
  
  // Apply margin percent filters
  if (minMarginPercent !== undefined) {
    customersWithMetrics = customersWithMetrics.filter(c => c.margin_percent >= minMarginPercent);
  }
  if (maxMarginPercent !== undefined) {
    customersWithMetrics = customersWithMetrics.filter(c => c.margin_percent <= maxMarginPercent);
  }
  
  // Map sortBy parameter to field name
  const sortField: keyof CustomerProfitability = {
    margin: 'gross_margin',
    revenue: 'total_revenue',
    margin_percent: 'margin_percent'
  }[filterSortBy] as keyof CustomerProfitability;
  
  // Sort and limit
  const sorted = sortByField(customersWithMetrics, sortField, filterOrder);
  return limitResults(sorted, filterLimit);
}
