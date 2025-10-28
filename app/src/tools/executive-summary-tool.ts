import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { 
  getExecutiveDashboard, 
  getProblemAreasReport 
} from '../lib/database';

export const executiveSummaryTool = createTool({
  id: 'executive-summary',
  description: `Get executive-level summaries and identify problem areas requiring attention.
  
  Use this tool when asked for:
  - Executive dashboard or high-level overview
  - Overall business performance metrics
  - Problem areas or issues requiring attention
  - Summary of key metrics (revenue, margins, customers, products)
  - What needs immediate attention
  
  Provides comprehensive KPIs including revenue, margins, customer concentration,
  and highlights specific problems like negative margins, high discounts, and inactive customers.`,
  
  inputSchema: z.object({
    reportType: z.enum(['dashboard', 'problems']).describe('Get executive dashboard or problem areas report'),
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format')
  }),
  
  outputSchema: z.union([
    // Dashboard output
    z.object({
      type: z.literal('dashboard'),
      totalRevenue: z.number(),
      totalCost: z.number(),
      grossMargin: z.number(),
      grossMarginPercent: z.number(),
      transactionCount: z.number(),
      uniqueCustomers: z.number(),
      uniqueProducts: z.number(),
      avgOrderValue: z.number(),
      top10CustomerConcentration: z.number(),
      negativeMarginCustomersCount: z.number(),
      negativeMarginAmount: z.number(),
      returnRatePercent: z.number(),
      avgDiscountPercent: z.number()
    }),
    // Problems output
    z.object({
      type: z.literal('problems'),
      negativeMarginCustomers: z.array(z.object({
        customerCode: z.string(),
        customerName: z.string(),
        margin: z.number()
      })),
      negativeMarginProducts: z.array(z.object({
        itemCode: z.string(),
        productDescription: z.string(),
        margin: z.number()
      })),
      highDiscountTransactions: z.array(z.object({
        invoiceNumber: z.string(),
        customerCode: z.string(),
        itemCode: z.string(),
        discountPercent: z.number(),
        margin: z.number()
      })),
      inactiveHighValueCustomers: z.array(z.object({
        customerCode: z.string(),
        customerName: z.string(),
        daysInactive: z.number(),
        lifetimeRevenue: z.number()
      }))
    })
  ]),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { reportType, startDate, endDate } = context;
    
    logger?.info('Executing executive-summary tool', {
      reportType,
      dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'default (last 12 months)'
    });
    
    if (reportType === 'dashboard') {
      const dashboard = getExecutiveDashboard(startDate, endDate);
      
      logger?.info('Executive dashboard generated', {
        totalRevenue: dashboard.total_revenue.toFixed(2),
        grossMargin: dashboard.gross_margin.toFixed(2),
        marginPercent: dashboard.gross_margin_percent.toFixed(2) + '%',
        customerCount: dashboard.unique_customers,
        negativeMarginCount: dashboard.negative_margin_customers_count
      });
      
      return {
        type: 'dashboard' as const,
        totalRevenue: dashboard.total_revenue,
        totalCost: dashboard.total_cost,
        grossMargin: dashboard.gross_margin,
        grossMarginPercent: dashboard.gross_margin_percent,
        transactionCount: dashboard.transaction_count,
        uniqueCustomers: dashboard.unique_customers,
        uniqueProducts: dashboard.unique_products,
        avgOrderValue: dashboard.avg_order_value,
        top10CustomerConcentration: dashboard.top_10_customer_concentration_percent,
        negativeMarginCustomersCount: dashboard.negative_margin_customers_count,
        negativeMarginAmount: dashboard.negative_margin_amount,
        returnRatePercent: dashboard.return_rate_percent,
        avgDiscountPercent: dashboard.avg_discount_percent
      };
    } else {
      const problems = getProblemAreasReport(startDate, endDate);
      
      logger?.info('Problem areas report generated', {
        negativeMarginCustomers: problems.negative_margin_customers.length,
        negativeMarginProducts: problems.negative_margin_products.length,
        highDiscountTransactions: problems.high_discount_transactions.length,
        inactiveHighValueCustomers: problems.inactive_high_value_customers.length
      });
      
      return {
        type: 'problems' as const,
        negativeMarginCustomers: problems.negative_margin_customers.map(c => ({
          customerCode: c.customer_code,
          customerName: c.customer_name,
          margin: c.margin
        })),
        negativeMarginProducts: problems.negative_margin_products.map(p => ({
          itemCode: p.item_code,
          productDescription: p.product_description,
          margin: p.margin
        })),
        highDiscountTransactions: problems.high_discount_transactions.map(t => ({
          invoiceNumber: t.invoice_number,
          customerCode: t.customer_code,
          itemCode: t.item_code,
          discountPercent: t.discount_percent,
          margin: t.margin
        })),
        inactiveHighValueCustomers: problems.inactive_high_value_customers.map(c => ({
          customerCode: c.customer_code,
          customerName: c.customer_name,
          daysInactive: c.days_inactive,
          lifetimeRevenue: c.lifetime_revenue
        }))
      };
    }
  }
});

