import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { 
  getCustomerSales,
  getSalesTransactions,
  calculateMarginPercent
} from '../lib/queries';

export const customerAnalysisTool = createTool({
  id: 'customer-analysis',
  description: `Analyze customer behavior, lifetime value, segmentation, and churn risk.
  
  Use this tool when asked about:
  - Customer lifetime value (CLV) and trends
  - Customer segmentation by revenue or margin
  - Customer churn risk and declining patterns
  - Revenue concentration across customer base (80/20 analysis)
  - Customer purchase frequency and behavior patterns
  - High-value customers at risk of leaving
  
  Provides strategic insights for customer retention and growth strategies.`,
  
  inputSchema: z.object({
    analysisType: z.enum(['lifetime_value', 'segmentation', 'churn_risk', 'concentration'])
      .describe('Type of customer analysis to perform'),
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
    customerCode: z.string().optional().describe('Filter to specific customer for deep-dive analysis'),
    inactivityDays: z.number().optional().default(90)
      .describe('Days of inactivity to flag as churn risk'),
    revenueDeclineThreshold: z.number().optional().default(30)
      .describe('Percentage decline to flag as concerning (for churn analysis)'),
    limit: z.number().optional().default(20).describe('Maximum number of results to return')
  }),
  
  outputSchema: z.union([
    // Lifetime value output
    z.object({
      analysisType: z.literal('lifetime_value'),
      summary: z.object({
        totalCustomers: z.number(),
        avgLifetimeValue: z.number(),
        totalRevenue: z.number()
      }),
      customers: z.array(z.object({
        customerCode: z.string(),
        customerName: z.string(),
        firstPurchaseDate: z.string(),
        lastPurchaseDate: z.string(),
        customerAgeDays: z.number(),
        totalRevenue: z.number(),
        totalMargin: z.number(),
        totalTransactions: z.number(),
        avgOrderValue: z.number(),
        purchaseFrequencyPerMonth: z.number()
      }))
    }),
    // Segmentation output
    z.object({
      analysisType: z.literal('segmentation'),
      summary: z.object({
        totalCustomers: z.number(),
        highValueCount: z.number(),
        mediumValueCount: z.number(),
        lowValueCount: z.number()
      }),
      customers: z.array(z.object({
        customerCode: z.string(),
        customerName: z.string(),
        revenue: z.number(),
        margin: z.number(),
        marginPercent: z.number(),
        revenueSegment: z.enum(['high', 'medium', 'low']),
        marginSegment: z.enum(['high', 'medium', 'low']),
        combinedSegment: z.string()
      }))
    }),
    // Churn risk output
    z.object({
      analysisType: z.literal('churn_risk'),
      summary: z.object({
        totalCustomersAnalyzed: z.number(),
        highRiskCount: z.number(),
        mediumRiskCount: z.number(),
        atRiskRevenue: z.number()
      }),
      customers: z.array(z.object({
        customerCode: z.string(),
        customerName: z.string(),
        lastPurchaseDate: z.string(),
        daysSinceLastPurchase: z.number(),
        lifetimeRevenue: z.number(),
        lifetimeMargin: z.number(),
        riskLevel: z.enum(['high', 'medium', 'low']),
        riskReason: z.string()
      }))
    }),
    // Concentration output
    z.object({
      analysisType: z.literal('concentration'),
      summary: z.object({
        totalCustomers: z.number(),
        totalRevenue: z.number(),
        top10Revenue: z.number(),
        top10Percent: z.number(),
        top20Revenue: z.number(),
        top20Percent: z.number(),
        customersFor80PercentRevenue: z.number()
      }),
      topCustomers: z.array(z.object({
        rank: z.number(),
        customerCode: z.string(),
        customerName: z.string(),
        revenue: z.number(),
        revenuePercent: z.number(),
        cumulativePercent: z.number()
      }))
    })
  ]),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { 
      analysisType, 
      startDate, 
      endDate, 
      customerCode,
      inactivityDays,
      revenueDeclineThreshold,
      limit 
    } = context;
    
    logger?.info('Executing customer-analysis tool', {
      analysisType,
      dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'default (last 12 months)',
      filters: { customerCode, inactivityDays, revenueDeclineThreshold }
    });
    
    if (analysisType === 'lifetime_value') {
      // Calculate customer lifetime value
      const customers = getCustomerSales({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        customerCodes: customerCode ? [customerCode] : undefined,
        sortBy: 'revenue',
        sortOrder: 'desc',
        limit: customerCode ? 1 : limit
      });
      
      // Get transactions to calculate dates and frequency
      const allTransactions = getSalesTransactions({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        customerCode,
        limit: 10000
      });
      
      const customerMap = new Map<string, typeof allTransactions>();
      allTransactions.forEach(t => {
        if (!customerMap.has(t.customer_code)) {
          customerMap.set(t.customer_code, []);
        }
        customerMap.get(t.customer_code)!.push(t);
      });
      
      const results = customers.map(c => {
        const transactions = customerMap.get(c.customer_code) || [];
        const dates = transactions.map(t => new Date(t.invoice_date)).sort((a, b) => a.getTime() - b.getTime());
        
        const firstPurchaseDate = dates.length > 0 ? dates[0].toISOString().split('T')[0] : '';
        const lastPurchaseDate = dates.length > 0 ? dates[dates.length - 1].toISOString().split('T')[0] : '';
        
        const customerAgeDays = dates.length > 1 
          ? Math.max(1, Math.floor((dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)))
          : 1;
        
        const purchaseFrequencyPerMonth = (c.transaction_count / customerAgeDays) * 30;
        const avgOrderValue = c.total_revenue / c.transaction_count;
        const margin = c.total_revenue - c.total_cost;
        
        return {
          customerCode: c.customer_code,
          customerName: c.customer_name,
          firstPurchaseDate,
          lastPurchaseDate,
          customerAgeDays,
          totalRevenue: c.total_revenue,
          totalMargin: margin,
          totalTransactions: c.transaction_count,
          avgOrderValue,
          purchaseFrequencyPerMonth
        };
      });
      
      const avgLifetimeValue = results.length > 0 
        ? results.reduce((sum, c) => sum + c.totalRevenue, 0) / results.length
        : 0;
      const totalRevenue = results.reduce((sum, c) => sum + c.totalRevenue, 0);
      
      logger?.info('Customer lifetime value analysis complete', {
        totalCustomers: results.length,
        avgLifetimeValue: avgLifetimeValue.toFixed(2),
        totalRevenue: totalRevenue.toFixed(2)
      });
      
      return {
        analysisType: 'lifetime_value' as const,
        summary: {
          totalCustomers: results.length,
          avgLifetimeValue,
          totalRevenue
        },
        customers: results
      };
      
    } else if (analysisType === 'segmentation') {
      // Segment customers by revenue and margin
      const customers = getCustomerSales({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        sortBy: 'revenue',
        sortOrder: 'desc',
        limit: 200 // Get more for better segmentation
      });
      
      const withMargins = customers.map(c => ({
        ...c,
        margin: c.total_revenue - c.total_cost,
        marginPercent: calculateMarginPercent(c.total_revenue, c.total_cost)
      })).sort((a, b) => b.total_revenue - a.total_revenue);
      
      // Calculate percentile thresholds
      const revenueP67 = withMargins[Math.floor(withMargins.length * 0.33)]?.total_revenue || 0;
      const revenueP33 = withMargins[Math.floor(withMargins.length * 0.67)]?.total_revenue || 0;
      
      const sortedByMargin = [...withMargins].sort((a, b) => b.marginPercent - a.marginPercent);
      const marginP67 = sortedByMargin[Math.floor(sortedByMargin.length * 0.33)]?.marginPercent || 0;
      const marginP33 = sortedByMargin[Math.floor(sortedByMargin.length * 0.67)]?.marginPercent || 0;
      
      const segmented = withMargins.map(c => {
        const revenueSegment = c.total_revenue >= revenueP67 ? 'high' : 
                               c.total_revenue >= revenueP33 ? 'medium' : 'low';
        const marginSegment = c.marginPercent >= marginP67 ? 'high' :
                              c.marginPercent >= marginP33 ? 'medium' : 'low';
        
        return {
          customerCode: c.customer_code,
          customerName: c.customer_name,
          revenue: c.total_revenue,
          margin: c.margin,
          marginPercent: c.marginPercent,
          revenueSegment: revenueSegment as 'high' | 'medium' | 'low',
          marginSegment: marginSegment as 'high' | 'medium' | 'low',
          combinedSegment: `${revenueSegment}_revenue_${marginSegment}_margin`
        };
      }).slice(0, limit);
      
      const highValueCount = segmented.filter(c => c.revenueSegment === 'high').length;
      const mediumValueCount = segmented.filter(c => c.revenueSegment === 'medium').length;
      const lowValueCount = segmented.filter(c => c.revenueSegment === 'low').length;
      
      logger?.info('Customer segmentation complete', {
        totalCustomers: segmented.length,
        highValue: highValueCount,
        mediumValue: mediumValueCount,
        lowValue: lowValueCount
      });
      
      return {
        analysisType: 'segmentation' as const,
        summary: {
          totalCustomers: segmented.length,
          highValueCount,
          mediumValueCount,
          lowValueCount
        },
        customers: segmented
      };
      
    } else if (analysisType === 'churn_risk') {
      // Identify customers at risk of churning
      const customers = getCustomerSales({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        sortBy: 'revenue',
        sortOrder: 'desc',
        limit: 200
      });
      
      const allTransactions = getSalesTransactions({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        limit: 10000
      });
      
      const customerMap = new Map<string, typeof allTransactions>();
      allTransactions.forEach(t => {
        if (!customerMap.has(t.customer_code)) {
          customerMap.set(t.customer_code, []);
        }
        customerMap.get(t.customer_code)!.push(t);
      });
      
      const today = new Date();
      const results = customers.map(c => {
        const transactions = customerMap.get(c.customer_code) || [];
        const dates = transactions.map(t => new Date(t.invoice_date)).sort((a, b) => a.getTime() - b.getTime());
        
        const lastPurchaseDate = dates.length > 0 ? dates[dates.length - 1] : new Date(0);
        const daysSinceLastPurchase = Math.floor((today.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const margin = c.total_revenue - c.total_cost;
        
        // Determine risk level
        let riskLevel: 'high' | 'medium' | 'low' = 'low';
        let riskReason = 'Active customer';
        
        if (daysSinceLastPurchase > inactivityDays!) {
          if (c.total_revenue > 10000) {
            riskLevel = 'high';
            riskReason = `High-value customer inactive for ${daysSinceLastPurchase} days`;
          } else {
            riskLevel = 'medium';
            riskReason = `Inactive for ${daysSinceLastPurchase} days`;
          }
        }
        
        return {
          customerCode: c.customer_code,
          customerName: c.customer_name,
          lastPurchaseDate: lastPurchaseDate.toISOString().split('T')[0],
          daysSinceLastPurchase,
          lifetimeRevenue: c.total_revenue,
          lifetimeMargin: margin,
          riskLevel,
          riskReason
        };
      })
      .filter(c => c.riskLevel !== 'low')
      .sort((a, b) => {
        if (a.riskLevel === 'high' && b.riskLevel !== 'high') return -1;
        if (a.riskLevel !== 'high' && b.riskLevel === 'high') return 1;
        return b.lifetimeRevenue - a.lifetimeRevenue;
      })
      .slice(0, limit);
      
      const highRiskCount = results.filter(c => c.riskLevel === 'high').length;
      const mediumRiskCount = results.filter(c => c.riskLevel === 'medium').length;
      const atRiskRevenue = results.reduce((sum, c) => sum + c.lifetimeRevenue, 0);
      
      logger?.info('Churn risk analysis complete', {
        totalCustomersAnalyzed: customers.length,
        highRisk: highRiskCount,
        mediumRisk: mediumRiskCount,
        atRiskRevenue: atRiskRevenue.toFixed(2)
      });
      
      return {
        analysisType: 'churn_risk' as const,
        summary: {
          totalCustomersAnalyzed: customers.length,
          highRiskCount,
          mediumRiskCount,
          atRiskRevenue
        },
        customers: results
      };
      
    } else {
      // concentration analysis
      const customers = getCustomerSales({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        sortBy: 'revenue',
        sortOrder: 'desc',
        limit: 500
      });
      
      const totalRevenue = customers.reduce((sum, c) => sum + c.total_revenue, 0);
      
      let cumulativeRevenue = 0;
      let customersFor80Percent = 0;
      
      const topCustomers = customers.map((c, index) => {
        cumulativeRevenue += c.total_revenue;
        const cumulativePercent = (cumulativeRevenue / totalRevenue) * 100;
        
        if (cumulativePercent <= 80 && customersFor80Percent === 0) {
          customersFor80Percent = index + 1;
        }
        
        return {
          rank: index + 1,
          customerCode: c.customer_code,
          customerName: c.customer_name,
          revenue: c.total_revenue,
          revenuePercent: (c.total_revenue / totalRevenue) * 100,
          cumulativePercent
        };
      }).slice(0, limit);
      
      const top10Revenue = customers.slice(0, 10).reduce((sum, c) => sum + c.total_revenue, 0);
      const top10Percent = (top10Revenue / totalRevenue) * 100;
      const top20Revenue = customers.slice(0, 20).reduce((sum, c) => sum + c.total_revenue, 0);
      const top20Percent = (top20Revenue / totalRevenue) * 100;
      
      logger?.info('Revenue concentration analysis complete', {
        totalCustomers: customers.length,
        top10Percent: top10Percent.toFixed(2) + '%',
        top20Percent: top20Percent.toFixed(2) + '%',
        customersFor80Percent
      });
      
      return {
        analysisType: 'concentration' as const,
        summary: {
          totalCustomers: customers.length,
          totalRevenue,
          top10Revenue,
          top10Percent,
          top20Revenue,
          top20Percent,
          customersFor80PercentRevenue: customersFor80Percent
        },
        topCustomers
      };
    }
  }
});

