import { getSalesTransactions } from './base-queries/sales-transactions';
import { getCustomerSales } from './base-queries/customer-sales';
import { getCustomerProfitability } from './get-customer-profitability';
import { calculateMargin, calculateMarginPercent, calculateAverage, calculatePercentageOfTotal, sortByField, limitResults } from './utils/calculations';
import Decimal from 'decimal.js-light';

export interface ExecutiveDashboard {
  total_revenue: number;
  total_cost: number;
  gross_margin: number;
  gross_margin_percent: number;
  transaction_count: number;
  unique_customers: number;
  unique_products: number;
  avg_order_value: number;
  top_10_customer_concentration_percent: number;
  negative_margin_customers_count: number;
  negative_margin_amount: number;
  return_rate_percent: number;
  avg_discount_percent: number;
}

/**
 * Get executive dashboard with high-level KPIs
 */
export function getExecutiveDashboard(
  startDate?: string,
  endDate?: string
): ExecutiveDashboard {
  // Get all non-return, non-sample transactions
  const transactions = getSalesTransactions({
    startDate,
    endDate,
    includeReturns: false,
    includeSamples: false,
    documentTypes: ['INV']
  });
  
  // Calculate main metrics
  const totalRevenue = transactions.reduce((sum, t) => {
    const lineTotal = t.line_total ?? 0;
    return new Decimal(sum).plus(lineTotal).toNumber();
  }, 0);
  
  const totalCost = transactions.reduce((sum, t) => {
    const cost = t.landed_cost_euro ?? 0;
    const quantity = t.quantity ?? 0;
    return new Decimal(sum).plus(new Decimal(quantity).times(cost)).toNumber();
  }, 0);
  
  const transactionCount = transactions.length;
  const uniqueCustomers = new Set(transactions.map(t => t.customer_code)).size;
  const uniqueProducts = new Set(transactions.map(t => t.item_code)).size;
  const avgDiscountPercent = calculateAverage(
    transactions.reduce((sum, t) => sum + t.discount_percent, 0),
    transactionCount
  );
  
  // Calculate top 10 customer concentration
  const customerSales = getCustomerSales({
    startDate,
    endDate,
    includeReturns: false,
    includeSamples: false
  });
  
  const top10Customers = limitResults(
    sortByField(customerSales, 'total_revenue', 'desc'),
    10
  );
  
  const top10Revenue = top10Customers.reduce((sum, c) => sum + c.total_revenue, 0);
  const top10ConcentrationPercent = calculatePercentageOfTotal(top10Revenue, totalRevenue);
  
  // Negative margin metrics
  const negativeMargins = getCustomerProfitability({
    startDate,
    endDate,
    includeReturns: false,
    maxMarginPercent: 0,
    sortBy: 'margin',
    order: 'asc'
  });
  const negativeMarginCustomersCount = negativeMargins.length;
  const negativeMarginAmount = negativeMargins.reduce((sum, c) => sum + c.gross_margin, 0);
  
  // Return rate calculation
  const allTransactions = getSalesTransactions({
    startDate,
    endDate,
    includeReturns: true,
    includeSamples: false,
    documentTypes: ['INV', 'CN']
  });
  
  const returnAmount = allTransactions
    .filter(t => t.is_return === 1)
    .reduce((sum, t) => sum + Math.abs(t.line_total), 0);
  
  const salesAmount = allTransactions
    .filter(t => t.is_return === 0)
    .reduce((sum, t) => sum + t.line_total, 0);
  
  const returnRatePercent = calculatePercentageOfTotal(returnAmount, salesAmount);
  
  return {
    total_revenue: totalRevenue,
    total_cost: totalCost,
    gross_margin: calculateMargin(totalRevenue, totalCost),
    gross_margin_percent: calculateMarginPercent(totalRevenue, totalCost),
    transaction_count: transactionCount,
    unique_customers: uniqueCustomers,
    unique_products: uniqueProducts,
    avg_order_value: calculateAverage(totalRevenue, transactionCount),
    top_10_customer_concentration_percent: top10ConcentrationPercent,
    negative_margin_customers_count: negativeMarginCustomersCount,
    negative_margin_amount: negativeMarginAmount,
    return_rate_percent: returnRatePercent,
    avg_discount_percent: avgDiscountPercent
  };
}
