import { getSalesTransactions } from './base-queries/sales-transactions';
import { getCustomerSales } from './base-queries/customer-sales';
import { getCustomerProfitability } from './get-customer-profitability';
import { getProductPerformance } from './get-product-performance';
import { calculateMargin, filterHighDiscounts, sortByField, limitResults } from './utils/calculations';
import Decimal from 'decimal.js-light';

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
  // Top 10 negative margin customers
  const negativeCustomers = getCustomerProfitability({
    startDate,
    endDate,
    includeReturns: false,
    maxMarginPercent: 0,
    sortBy: 'margin',
    order: 'asc',
    limit: 10
  }).map(c => ({
    customer_code: c.customer_code,
    customer_name: c.customer_name,
    margin: c.gross_margin
  }));
  
  // Top 10 negative margin products
  const negativeProducts = getProductPerformance({
    startDate,
    endDate,
    maxMarginPercent: 0,
    minTransactions: 1,
    sortBy: 'margin',
    order: 'asc',
    limit: 10
  }).map(p => ({
    item_code: p.item_code,
    product_description: p.product_description,
    margin: p.margin
  }));
  
  // High discount transactions (>20%)
  const transactions = getSalesTransactions({
    startDate,
    endDate,
    includeReturns: false,
    includeSamples: false,
    documentTypes: ['INV']
  });
  
  const transactionsWithMargin = transactions.map(t => {
    const cost = (t.landed_cost_euro ?? 0) * t.quantity;
    return {
      invoice_number: t.invoice_number,
      customer_code: t.customer_code,
      item_code: t.item_code,
      discount_percent: t.discount_percent,
      margin: calculateMargin(t.line_total, cost)
    };
  });
  
  const highDiscounts = limitResults(
    sortByField(
      filterHighDiscounts(transactionsWithMargin, 20),
      'discount_percent',
      'desc'
    ),
    10
  );
  
  // Inactive high-value customers (>90 days no purchase, >€10k lifetime)
  // Get all customer sales (lifetime, not filtered by date)
  const allCustomerSales = getCustomerSales({
    includeSamples: false,
    includeReturns: false
  });
  
  // Get last transaction date for each customer
  const allTransactions = getSalesTransactions({
    includeSamples: false,
    includeReturns: false,
    documentTypes: ['INV']
  });
  
  const customerLastTransaction = new Map<string, string>();
  allTransactions.forEach(t => {
    const lastDate = customerLastTransaction.get(t.customer_code);
    if (!lastDate || t.invoice_date > lastDate) {
      customerLastTransaction.set(t.customer_code, t.invoice_date);
    }
  });
  
  const now = new Date();
  const inactiveCustomers = allCustomerSales
    .map(customer => {
      const lastTransactionDate = customerLastTransaction.get(customer.customer_code);
      if (!lastTransactionDate) return null;
      
      const lastDate = new Date(lastTransactionDate);
      const daysInactive = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        customer_code: customer.customer_code,
        customer_name: customer.customer_name,
        days_inactive: daysInactive,
        lifetime_revenue: customer.total_revenue
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .filter(c => c.days_inactive > 90 && c.lifetime_revenue > 10000);
  
  const inactiveHighValue = limitResults(
    sortByField(inactiveCustomers, 'lifetime_revenue', 'desc'),
    10
  );
  
  return {
    negative_margin_customers: negativeCustomers,
    negative_margin_products: negativeProducts,
    high_discount_transactions: highDiscounts,
    inactive_high_value_customers: inactiveHighValue
  };
}
