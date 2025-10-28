import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { 
  getSalesTransactions,
  getCustomerSales,
  getProductSales,
  calculateMarginPercent
} from '../lib/queries';

export const discountReturnsTool = createTool({
  id: 'discount-returns',
  description: `Analyze discounts, returns, rebates, and credit notes impact on profitability.
  
  Use this tool when asked about:
  - Discount effectiveness and impact on margins
  - High or excessive discounts that may indicate problems
  - Return patterns by customer or product
  - Rebate analysis and impact
  - Credit note analysis (returns + rebates combined)
  - Whether discounts drive volume or destroy margins
  
  Helps identify pricing policy violations and opportunities to improve margin through better discount management.`,
  
  inputSchema: z.object({
    analysisType: z.enum(['discount_effectiveness', 'high_discounts', 'returns', 'rebates', 'credit_notes'])
      .describe('Type of discount/return analysis to perform'),
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
    groupBy: z.enum(['customer', 'product', 'month', 'overall']).optional().default('overall')
      .describe('How to group the analysis results'),
    thresholdPercent: z.number().optional().default(20)
      .describe('Discount threshold percentage to flag as high (for high_discounts analysis)'),
    minDiscountPercent: z.number().optional().default(5)
      .describe('Minimum discount percentage to include in analysis'),
    limit: z.number().optional().default(20).describe('Maximum number of results to return')
  }),
  
  outputSchema: z.union([
    // Discount effectiveness output
    z.object({
      analysisType: z.literal('discount_effectiveness'),
      summary: z.object({
        totalRevenue: z.number(),
        totalDiscountGiven: z.number(),
        avgDiscountPercent: z.number(),
        marginImpact: z.number()
      }),
      items: z.array(z.object({
        dimensionKey: z.string(),
        dimensionName: z.string(),
        revenueWithDiscount: z.number(),
        revenueWithoutDiscount: z.number(),
        avgDiscountPercent: z.number(),
        marginWithDiscount: z.number(),
        marginWithoutDiscount: z.number(),
        marginErosionPercent: z.number(),
        transactionCount: z.number()
      }))
    }),
    // High discounts output
    z.object({
      analysisType: z.literal('high_discounts'),
      summary: z.object({
        totalTransactions: z.number(),
        highDiscountTransactions: z.number(),
        totalRevenueAtRisk: z.number(),
        avgDiscount: z.number()
      }),
      transactions: z.array(z.object({
        invoiceNumber: z.string(),
        invoiceDate: z.string(),
        customerCode: z.string(),
        customerName: z.string(),
        itemCode: z.string(),
        productDescription: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        discountPercent: z.number(),
        lineTotal: z.number(),
        margin: z.number(),
        marginPercent: z.number()
      }))
    }),
    // Returns output
    z.object({
      analysisType: z.literal('returns'),
      summary: z.object({
        totalSalesRevenue: z.number(),
        totalReturnsValue: z.number(),
        returnRatePercent: z.number(),
        netRevenue: z.number()
      }),
      items: z.array(z.object({
        dimensionKey: z.string(),
        dimensionName: z.string(),
        salesRevenue: z.number(),
        returnsValue: z.number(),
        returnRatePercent: z.number(),
        netRevenue: z.number(),
        salesCount: z.number(),
        returnCount: z.number()
      }))
    }),
    // Rebates output
    z.object({
      analysisType: z.literal('rebates'),
      summary: z.object({
        totalRebatesGiven: z.number(),
        rebateCount: z.number(),
        totalSales: z.number(),
        rebateAsPercentOfSales: z.number()
      }),
      items: z.array(z.object({
        dimensionKey: z.string(),
        dimensionName: z.string(),
        rebatesGiven: z.number(),
        rebateCount: z.number(),
        totalSales: z.number(),
        rebatePercent: z.number(),
        marginBeforeRebate: z.number(),
        marginAfterRebate: z.number()
      }))
    }),
    // Credit notes output
    z.object({
      analysisType: z.literal('credit_notes'),
      summary: z.object({
        totalInvoices: z.number(),
        totalInvoiceValue: z.number(),
        totalCreditNotes: z.number(),
        totalCreditNoteValue: z.number(),
        returnsCount: z.number(),
        returnsValue: z.number(),
        rebatesCount: z.number(),
        rebatesValue: z.number(),
        netRevenue: z.number(),
        creditNoteRatePercent: z.number()
      })
    })
  ]),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { 
      analysisType, 
      startDate, 
      endDate, 
      groupBy,
      thresholdPercent,
      minDiscountPercent,
      limit 
    } = context;
    
    logger?.info('Executing discount-returns tool', {
      analysisType,
      dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'default (last 12 months)',
      groupBy,
      thresholds: { thresholdPercent, minDiscountPercent }
    });
    
    if (analysisType === 'discount_effectiveness') {
      // Analyze if discounts are effective
      const transactions = getSalesTransactions({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        minDiscount: minDiscountPercent,
        limit: 5000
      });
      
      const allTransactions = getSalesTransactions({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        limit: 5000
      });
      
      // Group by dimension
      const groupMap = new Map<string, { 
        withDiscount: typeof transactions; 
        withoutDiscount: typeof transactions;
        name: string;
      }>();
      
      transactions.forEach(t => {
        const key = groupBy === 'customer' ? t.customer_code : 
                    groupBy === 'product' ? t.item_code :
                    groupBy === 'month' ? t.invoice_date.substring(0, 7) :
                    'overall';
        
        if (!groupMap.has(key)) {
          groupMap.set(key, { 
            withDiscount: [], 
            withoutDiscount: [],
            name: groupBy === 'customer' ? t.customer_name :
                  groupBy === 'product' ? t.product_description || '' :
                  groupBy === 'month' ? key :
                  'All Transactions'
          });
        }
        groupMap.get(key)!.withDiscount.push(t);
      });
      
      allTransactions.filter(t => t.discount_percent < minDiscountPercent!).forEach(t => {
        const key = groupBy === 'customer' ? t.customer_code : 
                    groupBy === 'product' ? t.item_code :
                    groupBy === 'month' ? t.invoice_date.substring(0, 7) :
                    'overall';
        
        if (!groupMap.has(key)) {
          groupMap.set(key, { 
            withDiscount: [], 
            withoutDiscount: [],
            name: groupBy === 'customer' ? t.customer_name :
                  groupBy === 'product' ? t.product_description || '' :
                  groupBy === 'month' ? key :
                  'All Transactions'
          });
        }
        groupMap.get(key)!.withoutDiscount.push(t);
      });
      
      const items = Array.from(groupMap.entries())
        .map(([key, data]) => {
          const revenueWithDiscount = data.withDiscount.reduce((sum, t) => sum + t.line_total, 0);
          const revenueWithoutDiscount = data.withoutDiscount.reduce((sum, t) => sum + t.line_total, 0);
          
          const avgDiscount = data.withDiscount.length > 0
            ? data.withDiscount.reduce((sum, t) => sum + t.discount_percent, 0) / data.withDiscount.length
            : 0;
          
          const costWithDiscount = data.withDiscount.reduce((sum, t) => 
            sum + (t.landed_cost_euro ? t.quantity * t.landed_cost_euro : 0), 0);
          const costWithoutDiscount = data.withoutDiscount.reduce((sum, t) => 
            sum + (t.landed_cost_euro ? t.quantity * t.landed_cost_euro : 0), 0);
          
          const marginWithDiscount = revenueWithDiscount - costWithDiscount;
          const marginWithoutDiscount = revenueWithoutDiscount - costWithoutDiscount;
          const marginErosionPercent = marginWithoutDiscount > 0
            ? ((marginWithoutDiscount - marginWithDiscount) / marginWithoutDiscount) * 100
            : 0;
          
          return {
            dimensionKey: key,
            dimensionName: data.name,
            revenueWithDiscount,
            revenueWithoutDiscount,
            avgDiscountPercent: avgDiscount,
            marginWithDiscount,
            marginWithoutDiscount,
            marginErosionPercent,
            transactionCount: data.withDiscount.length + data.withoutDiscount.length
          };
        })
        .filter(item => item.transactionCount >= 5)
        .sort((a, b) => Math.abs(b.marginErosionPercent) - Math.abs(a.marginErosionPercent))
        .slice(0, limit);
      
      const totalRevenue = items.reduce((sum, i) => sum + i.revenueWithDiscount + i.revenueWithoutDiscount, 0);
      const totalDiscount = items.reduce((sum, i) => 
        sum + (i.revenueWithDiscount * i.avgDiscountPercent / 100), 0);
      const avgDiscountPercent = items.length > 0
        ? items.reduce((sum, i) => sum + i.avgDiscountPercent, 0) / items.length
        : 0;
      const marginImpact = items.reduce((sum, i) => sum + (i.marginWithoutDiscount - i.marginWithDiscount), 0);
      
      logger?.info('Discount effectiveness analysis complete', {
        itemsAnalyzed: items.length,
        totalRevenue: totalRevenue.toFixed(2),
        avgDiscountPercent: avgDiscountPercent.toFixed(2) + '%',
        marginImpact: marginImpact.toFixed(2)
      });
      
      return {
        analysisType: 'discount_effectiveness' as const,
        summary: {
          totalRevenue,
          totalDiscountGiven: totalDiscount,
          avgDiscountPercent,
          marginImpact
        },
        items
      };
      
    } else if (analysisType === 'high_discounts') {
      // Flag unusually high discounts
      const transactions = getSalesTransactions({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        minDiscount: thresholdPercent,
        limit: 1000
      });
      
      const flagged = transactions.map(t => {
        const cost = t.landed_cost_euro ? t.quantity * t.landed_cost_euro : 0;
        const margin = t.line_total - cost;
        const marginPercent = calculateMarginPercent(t.line_total, cost);
        
        return {
          invoiceNumber: t.invoice_number,
          invoiceDate: t.invoice_date,
          customerCode: t.customer_code,
          customerName: t.customer_name,
          itemCode: t.item_code,
          productDescription: t.product_description || '',
          quantity: t.quantity,
          unitPrice: t.unit_price,
          discountPercent: t.discount_percent,
          lineTotal: t.line_total,
          margin,
          marginPercent
        };
      })
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, limit);
      
      const totalRevenueAtRisk = flagged.reduce((sum, t) => sum + t.lineTotal, 0);
      const avgDiscount = flagged.length > 0
        ? flagged.reduce((sum, t) => sum + t.discountPercent, 0) / flagged.length
        : 0;
      
      logger?.info('High discounts analysis complete', {
        totalTransactions: transactions.length,
        highDiscountTransactions: flagged.length,
        avgDiscount: avgDiscount.toFixed(2) + '%',
        revenueAtRisk: totalRevenueAtRisk.toFixed(2)
      });
      
      return {
        analysisType: 'high_discounts' as const,
        summary: {
          totalTransactions: transactions.length,
          highDiscountTransactions: flagged.length,
          totalRevenueAtRisk,
          avgDiscount
        },
        transactions: flagged
      };
      
    } else if (analysisType === 'returns') {
      // Analyze return patterns
      const salesTransactions = getSalesTransactions({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        documentTypes: ['INV'],
        limit: 10000
      });
      
      const returnTransactions = getSalesTransactions({
        startDate,
        endDate,
        includeReturns: true,
        includeSamples: false,
        limit: 10000
      }).filter(t => t.is_return === 1);
      
      // Group by dimension
      const dimensionMap = new Map<string, {
        sales: typeof salesTransactions;
        returns: typeof returnTransactions;
        name: string;
      }>();
      
      salesTransactions.forEach(t => {
        const key = groupBy === 'customer' ? t.customer_code :
                    groupBy === 'product' ? t.item_code :
                    groupBy === 'month' ? t.invoice_date.substring(0, 7) :
                    'overall';
        
        if (!dimensionMap.has(key)) {
          dimensionMap.set(key, { 
            sales: [], 
            returns: [],
            name: groupBy === 'customer' ? t.customer_name :
                  groupBy === 'product' ? t.product_description || '' :
                  groupBy === 'month' ? key :
                  'All'
          });
        }
        dimensionMap.get(key)!.sales.push(t);
      });
      
      returnTransactions.forEach(t => {
        const key = groupBy === 'customer' ? t.customer_code :
                    groupBy === 'product' ? t.item_code :
                    groupBy === 'month' ? t.invoice_date.substring(0, 7) :
                    'overall';
        
        if (!dimensionMap.has(key)) {
          dimensionMap.set(key, { 
            sales: [], 
            returns: [],
            name: groupBy === 'customer' ? t.customer_name :
                  groupBy === 'product' ? t.product_description || '' :
                  groupBy === 'month' ? key :
                  'All'
          });
        }
        dimensionMap.get(key)!.returns.push(t);
      });
      
      const items = Array.from(dimensionMap.entries())
        .map(([key, data]) => {
          const salesRevenue = data.sales.reduce((sum, t) => sum + t.line_total, 0);
          const returnsValue = Math.abs(data.returns.reduce((sum, t) => sum + t.line_total, 0));
          const returnRatePercent = salesRevenue > 0 ? (returnsValue / salesRevenue) * 100 : 0;
          const netRevenue = salesRevenue - returnsValue;
          
          return {
            dimensionKey: key,
            dimensionName: data.name,
            salesRevenue,
            returnsValue,
            returnRatePercent,
            netRevenue,
            salesCount: data.sales.length,
            returnCount: data.returns.length
          };
        })
        .filter(item => item.salesCount > 0)
        .sort((a, b) => b.returnRatePercent - a.returnRatePercent)
        .slice(0, limit);
      
      const totalSalesRevenue = items.reduce((sum, i) => sum + i.salesRevenue, 0);
      const totalReturnsValue = items.reduce((sum, i) => sum + i.returnsValue, 0);
      const returnRatePercent = totalSalesRevenue > 0 ? (totalReturnsValue / totalSalesRevenue) * 100 : 0;
      const netRevenue = totalSalesRevenue - totalReturnsValue;
      
      logger?.info('Returns analysis complete', {
        itemsAnalyzed: items.length,
        totalSalesRevenue: totalSalesRevenue.toFixed(2),
        totalReturnsValue: totalReturnsValue.toFixed(2),
        returnRate: returnRatePercent.toFixed(2) + '%'
      });
      
      return {
        analysisType: 'returns' as const,
        summary: {
          totalSalesRevenue,
          totalReturnsValue,
          returnRatePercent,
          netRevenue
        },
        items
      };
      
    } else if (analysisType === 'rebates') {
      // Analyze rebates (credit notes that are not returns)
      const salesTransactions = getSalesTransactions({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        documentTypes: ['INV'],
        limit: 10000
      });
      
      const rebateTransactions = getSalesTransactions({
        startDate,
        endDate,
        includeReturns: true,
        includeSamples: false,
        documentTypes: ['CRN'],
        limit: 10000
      }).filter(t => t.is_return === 0); // Rebates are credit notes but not returns
      
      // Group by dimension
      const dimensionMap = new Map<string, {
        sales: typeof salesTransactions;
        rebates: typeof rebateTransactions;
        name: string;
      }>();
      
      salesTransactions.forEach(t => {
        const key = groupBy === 'customer' ? t.customer_code :
                    groupBy === 'month' ? t.invoice_date.substring(0, 7) :
                    'overall';
        
        if (!dimensionMap.has(key)) {
          dimensionMap.set(key, { 
            sales: [], 
            rebates: [],
            name: groupBy === 'customer' ? t.customer_name :
                  groupBy === 'month' ? key :
                  'All'
          });
        }
        dimensionMap.get(key)!.sales.push(t);
      });
      
      rebateTransactions.forEach(t => {
        const key = groupBy === 'customer' ? t.customer_code :
                    groupBy === 'month' ? t.invoice_date.substring(0, 7) :
                    'overall';
        
        if (dimensionMap.has(key)) {
          dimensionMap.get(key)!.rebates.push(t);
        }
      });
      
      const items = Array.from(dimensionMap.entries())
        .map(([key, data]) => {
          const totalSales = data.sales.reduce((sum, t) => sum + t.line_total, 0);
          const rebatesGiven = Math.abs(data.rebates.reduce((sum, t) => sum + t.line_total, 0));
          const rebatePercent = totalSales > 0 ? (rebatesGiven / totalSales) * 100 : 0;
          
          const salesCost = data.sales.reduce((sum, t) => 
            sum + (t.landed_cost_euro ? t.quantity * t.landed_cost_euro : 0), 0);
          const marginBeforeRebate = totalSales - salesCost;
          const marginAfterRebate = marginBeforeRebate - rebatesGiven;
          
          return {
            dimensionKey: key,
            dimensionName: data.name,
            rebatesGiven,
            rebateCount: data.rebates.length,
            totalSales,
            rebatePercent,
            marginBeforeRebate,
            marginAfterRebate
          };
        })
        .filter(item => item.rebateCount > 0)
        .sort((a, b) => b.rebatesGiven - a.rebatesGiven)
        .slice(0, limit);
      
      const totalRebates = items.reduce((sum, i) => sum + i.rebatesGiven, 0);
      const totalSales = items.reduce((sum, i) => sum + i.totalSales, 0);
      const rebateAsPercent = totalSales > 0 ? (totalRebates / totalSales) * 100 : 0;
      const rebateCount = items.reduce((sum, i) => sum + i.rebateCount, 0);
      
      logger?.info('Rebates analysis complete', {
        itemsAnalyzed: items.length,
        totalRebates: totalRebates.toFixed(2),
        rebateCount,
        rebateAsPercentOfSales: rebateAsPercent.toFixed(2) + '%'
      });
      
      return {
        analysisType: 'rebates' as const,
        summary: {
          totalRebatesGiven: totalRebates,
          rebateCount,
          totalSales,
          rebateAsPercentOfSales: rebateAsPercent
        },
        items
      };
      
    } else {
      // credit_notes - comprehensive analysis
      const invoices = getSalesTransactions({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        documentTypes: ['INV'],
        limit: 10000
      });
      
      const creditNotes = getSalesTransactions({
        startDate,
        endDate,
        includeReturns: true,
        includeSamples: false,
        documentTypes: ['CRN'],
        limit: 10000
      });
      
      const returns = creditNotes.filter(t => t.is_return === 1);
      const rebates = creditNotes.filter(t => t.is_return === 0);
      
      const totalInvoiceValue = invoices.reduce((sum, t) => sum + t.line_total, 0);
      const totalCreditNoteValue = Math.abs(creditNotes.reduce((sum, t) => sum + t.line_total, 0));
      const returnsValue = Math.abs(returns.reduce((sum, t) => sum + t.line_total, 0));
      const rebatesValue = Math.abs(rebates.reduce((sum, t) => sum + t.line_total, 0));
      const netRevenue = totalInvoiceValue - totalCreditNoteValue;
      const creditNoteRate = totalInvoiceValue > 0 ? (totalCreditNoteValue / totalInvoiceValue) * 100 : 0;
      
      logger?.info('Credit notes analysis complete', {
        totalInvoices: invoices.length,
        totalCreditNotes: creditNotes.length,
        creditNoteRate: creditNoteRate.toFixed(2) + '%',
        netRevenue: netRevenue.toFixed(2)
      });
      
      return {
        analysisType: 'credit_notes' as const,
        summary: {
          totalInvoices: invoices.length,
          totalInvoiceValue,
          totalCreditNotes: creditNotes.length,
          totalCreditNoteValue,
          returnsCount: returns.length,
          returnsValue,
          rebatesCount: rebates.length,
          rebatesValue,
          netRevenue,
          creditNoteRatePercent: creditNoteRate
        }
      };
    }
  }
});

