import Decimal from 'decimal.js-light';

// Configure Decimal.js-light for financial calculations
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -7,
  toExpPos: 21
});

/**
 * Calculate margin amount (revenue - cost)
 * @param revenue Total revenue
 * @param cost Total cost
 * @returns Margin amount rounded to 2 decimal places
 */
export function calculateMargin(revenue: number, cost: number): number {
  const revenueDecimal = new Decimal(revenue);
  const costDecimal = new Decimal(cost);
  return revenueDecimal.minus(costDecimal).toDecimalPlaces(2).toNumber();
}

/**
 * Calculate margin percentage ((revenue - cost) / cost * 100)
 * @param revenue Total revenue
 * @param cost Total cost
 * @returns Margin percentage rounded to 2 decimal places, or 0 if cost is 0
 */
export function calculateMarginPercent(revenue: number, cost: number): number {
  if (cost === 0) return 0;
  
  const revenueDecimal = new Decimal(revenue);
  const costDecimal = new Decimal(cost);
  const margin = revenueDecimal.minus(costDecimal);
  
  return margin.dividedBy(costDecimal).times(100).toDecimalPlaces(2).toNumber();
}

/**
 * Calculate average price (total revenue / quantity)
 * @param totalRevenue Total revenue
 * @param quantity Total quantity
 * @returns Average price rounded to 2 decimal places, or 0 if quantity is 0
 */
export function calculateAveragePrice(totalRevenue: number, quantity: number): number {
  if (quantity === 0) return 0;
  
  const revenueDecimal = new Decimal(totalRevenue);
  const quantityDecimal = new Decimal(quantity);
  
  return revenueDecimal.dividedBy(quantityDecimal).toDecimalPlaces(2).toNumber();
}

/**
 * Calculate average value (total / count)
 * @param total Total value
 * @param count Count
 * @returns Average value rounded to 2 decimal places, or 0 if count is 0
 */
export function calculateAverage(total: number, count: number): number {
  if (count === 0) return 0;
  
  const totalDecimal = new Decimal(total);
  const countDecimal = new Decimal(count);
  
  return totalDecimal.dividedBy(countDecimal).toDecimalPlaces(2).toNumber();
}

/**
 * Calculate percentage of total (value / total * 100)
 * @param value Value
 * @param total Total
 * @returns Percentage rounded to 2 decimal places, or 0 if total is 0
 */
export function calculatePercentageOfTotal(value: number, total: number): number {
  if (total === 0) return 0;
  
  const valueDecimal = new Decimal(value);
  const totalDecimal = new Decimal(total);
  
  return valueDecimal.dividedBy(totalDecimal).times(100).toDecimalPlaces(2).toNumber();
}

/**
 * Round a number to specified decimal places
 * @param value Value to round
 * @param decimalPlaces Number of decimal places (default: 2)
 * @returns Rounded number
 */
export function roundToDecimal(value: number, decimalPlaces: number = 2): number {
  return new Decimal(value).toDecimalPlaces(decimalPlaces).toNumber();
}

// Filter functions

/**
 * Filter records with negative margins
 * @param data Array of records with margin or total_margin field
 * @returns Filtered array with only negative margins
 */
export function filterNegativeMargins<T extends { margin?: number; total_margin?: number; gross_margin?: number }>(
  data: T[]
): T[] {
  return data.filter(record => {
    const margin = record.margin ?? record.total_margin ?? record.gross_margin ?? 0;
    return margin < 0;
  });
}

/**
 * Filter records by discount threshold
 * @param data Array of records with discount_percent field
 * @param threshold Minimum discount percentage
 * @returns Filtered array with discount above threshold
 */
export function filterHighDiscounts<T extends { discount_percent: number }>(
  data: T[],
  threshold: number
): T[] {
  return data.filter(record => record.discount_percent > threshold);
}

/**
 * Filter records by minimum transaction count
 * @param data Array of records with transaction_count field
 * @param minCount Minimum transaction count
 * @returns Filtered array with transaction_count >= minCount
 */
export function filterByMinTransactions<T extends { transaction_count: number }>(
  data: T[],
  minCount: number
): T[] {
  return data.filter(record => record.transaction_count >= minCount);
}

// Sort functions

/**
 * Sort array by specified field
 * @param data Array of records
 * @param field Field name to sort by
 * @param order Sort order ('asc' or 'desc')
 * @returns Sorted array (new array, doesn't mutate original)
 */
export function sortByField<T>(
  data: T[],
  field: keyof T,
  order: 'asc' | 'desc' = 'desc'
): T[] {
  const sorted = [...data];
  sorted.sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return order === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    return 0;
  });
  
  return sorted;
}

/**
 * Limit results to specified number
 * @param data Array of records
 * @param limit Maximum number of records to return
 * @returns Limited array
 */
export function limitResults<T>(data: T[], limit: number): T[] {
  return data.slice(0, limit);
}

/**
 * Apply pagination to results
 * @param data Array of records
 * @param page Page number (1-based)
 * @param pageSize Number of records per page
 * @returns Paginated array
 */
export function paginateResults<T>(data: T[], page: number, pageSize: number): T[] {
  const startIndex = (page - 1) * pageSize;
  return data.slice(startIndex, startIndex + pageSize);
}

// Discount calculation functions

/**
 * Transaction type with catalogue pricing information
 * This is the minimum required interface for discount calculations
 */
export interface TransactionWithCataloguePrice {
  quantity: number;
  line_total: number;
  catalogue_price_base: number | null;
}

/**
 * Calculate discount percentage for a transaction
 * Formula: ((quantity × catalogue_price) - line_total) / (quantity × catalogue_price) × 100
 * 
 * @param transaction - Sales transaction with catalogue price
 * @returns Discount percentage (positive = discount, negative = premium pricing, 0 = no discount or missing data)
 */
export function calculateDiscount(transaction: TransactionWithCataloguePrice): number {
  const cataloguePrice = transaction.catalogue_price_base;
  
  // Return 0 if no catalogue price, invalid price, or invalid quantity
  if (
    cataloguePrice === null || 
    cataloguePrice <= 0 || 
    transaction.quantity <= 0
  ) {
    return 0;
  }
  
  const expectedTotal = transaction.quantity * cataloguePrice;
  const actualTotal = transaction.line_total;
  
  // Calculate discount percentage
  const discount = ((expectedTotal - actualTotal) / expectedTotal) * 100;
  
  return roundToDecimal(discount, 2);
}

/**
 * Add discount calculations to an array of transactions
 * 
 * @param transactions - Array of sales transactions
 * @returns Array of transactions with discount_percent added
 */
export function addDiscountCalculations<T extends TransactionWithCataloguePrice>(
  transactions: T[]
): (T & { discount_percent: number })[] {
  return transactions.map(t => ({
    ...t,
    discount_percent: calculateDiscount(t)
  }));
}

/**
 * Filter transactions by discount range
 * 
 * @param transactions - Array of transactions with discounts
 * @param minDiscount - Minimum discount percentage (inclusive)
 * @param maxDiscount - Maximum discount percentage (inclusive)
 * @returns Filtered transactions
 */
export function filterByDiscount<T extends { discount_percent: number }>(
  transactions: T[],
  minDiscount?: number,
  maxDiscount?: number
): T[] {
  let filtered = transactions;
  
  if (minDiscount !== undefined) {
    filtered = filtered.filter(t => t.discount_percent >= minDiscount);
  }
  
  if (maxDiscount !== undefined) {
    filtered = filtered.filter(t => t.discount_percent <= maxDiscount);
  }
  
  return filtered;
}
