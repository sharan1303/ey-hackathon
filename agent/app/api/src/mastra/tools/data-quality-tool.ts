import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { 
  getSalesTransactions,
  getProductSales,
  calculateMarginPercent
} from '../lib/queries';

export const dataQualityTool = createTool({
  id: 'data-quality',
  description: `Detect data quality issues, anomalies, and missing information.
  
  Use this tool when asked about:
  - Unusual or anomalous transactions
  - Data quality issues and inconsistencies
  - Products with missing data (costs, catalogue prices, etc.)
  - Potential data entry errors
  - Transactions that deviate significantly from normal patterns
  
  Helps identify data problems that may affect analysis accuracy.`,
  
  inputSchema: z.object({
    reportType: z.enum(['anomalies', 'quality_summary', 'orphaned_products'])
      .describe('Type of data quality report to generate'),
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
    limit: z.number().optional().default(50).describe('Maximum number of results to return')
  }),
  
  outputSchema: z.union([
    // Anomalies output
    z.object({
      reportType: z.literal('anomalies'),
      summary: z.object({
        totalTransactionsAnalyzed: z.number(),
        anomaliesDetected: z.number(),
        anomalyRate: z.number()
      }),
      anomalies: z.array(z.object({
        invoiceNumber: z.string(),
        invoiceDate: z.string(),
        customerCode: z.string(),
        customerName: z.string(),
        itemCode: z.string(),
        productDescription: z.string(),
        anomalyType: z.string(),
        expectedValue: z.number().optional(),
        actualValue: z.number(),
        deviationPercent: z.number(),
        severity: z.enum(['high', 'medium', 'low']),
        description: z.string()
      }))
    }),
    // Quality summary output
    z.object({
      reportType: z.literal('quality_summary'),
      summary: z.object({
        totalSalesRecords: z.number(),
        recordsWithIssues: z.number(),
        issueRate: z.number()
      }),
      issues: z.array(z.object({
        issueType: z.string(),
        count: z.number(),
        percentOfTotal: z.number(),
        description: z.string(),
        impact: z.enum(['high', 'medium', 'low'])
      }))
    }),
    // Orphaned products output
    z.object({
      reportType: z.literal('orphaned_products'),
      summary: z.object({
        totalProducts: z.number(),
        productsWithIssues: z.number(),
        missingCostCount: z.number(),
        missingCatalogueCount: z.number()
      }),
      products: z.array(z.object({
        itemCode: z.string(),
        productDescription: z.string(),
        inSales: z.boolean(),
        hasCost: z.boolean(),
        hasCatalogue: z.boolean(),
        issueType: z.string(),
        transactionCount: z.number().optional(),
        totalRevenue: z.number().optional()
      }))
    })
  ]),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { 
      reportType, 
      startDate, 
      endDate, 
      limit 
    } = context;
    
    logger?.info('Executing data-quality tool', {
      reportType,
      dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'default (last 12 months)'
    });
    
    if (reportType === 'anomalies') {
      // Detect anomalous transactions
      const transactions = getSalesTransactions({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        limit: 5000
      });
      
      // Calculate statistics for anomaly detection
      const productStats = new Map<string, {
        prices: number[];
        quantities: number[];
        discounts: number[];
      }>();
      
      transactions.forEach(t => {
        if (!productStats.has(t.item_code)) {
          productStats.set(t.item_code, { prices: [], quantities: [], discounts: [] });
        }
        const stats = productStats.get(t.item_code)!;
        stats.prices.push(t.unit_price);
        stats.quantities.push(t.quantity);
        stats.discounts.push(t.discount_percent);
      });
      
      // Calculate averages and standard deviations
      const getStats = (values: number[]) => {
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        return { avg, stdDev };
      };
      
      const anomalies: Array<{
        invoiceNumber: string;
        invoiceDate: string;
        customerCode: string;
        customerName: string;
        itemCode: string;
        productDescription: string;
        anomalyType: string;
        expectedValue?: number;
        actualValue: number;
        deviationPercent: number;
        severity: 'high' | 'medium' | 'low';
        description: string;
      }> = [];
      
      transactions.forEach(t => {
        const stats = productStats.get(t.item_code);
        if (!stats || stats.prices.length < 5) return; // Need enough data points
        
        const priceStats = getStats(stats.prices);
        const qtyStats = getStats(stats.quantities);
        const discountStats = getStats(stats.discounts);
        
        // Check for unusual price
        const priceDeviation = Math.abs(t.unit_price - priceStats.avg) / priceStats.stdDev;
        if (priceDeviation > 2.5 && priceStats.stdDev > 0) {
          const deviationPercent = ((t.unit_price - priceStats.avg) / priceStats.avg) * 100;
          anomalies.push({
            invoiceNumber: t.invoice_number,
            invoiceDate: t.invoice_date,
            customerCode: t.customer_code,
            customerName: t.customer_name,
            itemCode: t.item_code,
            productDescription: t.product_description || '',
            anomalyType: 'unusual_price',
            expectedValue: priceStats.avg,
            actualValue: t.unit_price,
            deviationPercent: Math.abs(deviationPercent),
            severity: Math.abs(deviationPercent) > 100 ? 'high' : Math.abs(deviationPercent) > 50 ? 'medium' : 'low',
            description: `Price ${t.unit_price.toFixed(2)} deviates ${deviationPercent.toFixed(1)}% from average ${priceStats.avg.toFixed(2)}`
          });
        }
        
        // Check for unusual quantity
        const qtyDeviation = Math.abs(t.quantity - qtyStats.avg) / qtyStats.stdDev;
        if (qtyDeviation > 3 && qtyStats.stdDev > 0) {
          const deviationPercent = ((t.quantity - qtyStats.avg) / qtyStats.avg) * 100;
          anomalies.push({
            invoiceNumber: t.invoice_number,
            invoiceDate: t.invoice_date,
            customerCode: t.customer_code,
            customerName: t.customer_name,
            itemCode: t.item_code,
            productDescription: t.product_description || '',
            anomalyType: 'unusual_quantity',
            expectedValue: qtyStats.avg,
            actualValue: t.quantity,
            deviationPercent: Math.abs(deviationPercent),
            severity: Math.abs(deviationPercent) > 200 ? 'high' : Math.abs(deviationPercent) > 100 ? 'medium' : 'low',
            description: `Quantity ${t.quantity} deviates ${deviationPercent.toFixed(1)}% from average ${qtyStats.avg.toFixed(1)}`
          });
        }
        
        // Check for unusual discount
        if (t.discount_percent > 40) {
          anomalies.push({
            invoiceNumber: t.invoice_number,
            invoiceDate: t.invoice_date,
            customerCode: t.customer_code,
            customerName: t.customer_name,
            itemCode: t.item_code,
            productDescription: t.product_description || '',
            anomalyType: 'unusual_discount',
            actualValue: t.discount_percent,
            deviationPercent: t.discount_percent,
            severity: t.discount_percent > 60 ? 'high' : t.discount_percent > 50 ? 'medium' : 'low',
            description: `Very high discount of ${t.discount_percent.toFixed(1)}%`
          });
        }
        
        // Check for negative margin
        if (t.landed_cost_euro) {
          const cost = t.quantity * t.landed_cost_euro;
          const margin = t.line_total - cost;
          if (margin < 0) {
            const marginPercent = calculateMarginPercent(t.line_total, cost);
            anomalies.push({
              invoiceNumber: t.invoice_number,
              invoiceDate: t.invoice_date,
              customerCode: t.customer_code,
              customerName: t.customer_name,
              itemCode: t.item_code,
              productDescription: t.product_description || '',
              anomalyType: 'negative_margin',
              actualValue: margin,
              deviationPercent: Math.abs(marginPercent),
              severity: marginPercent < -20 ? 'high' : marginPercent < -10 ? 'medium' : 'low',
              description: `Selling below cost with ${marginPercent.toFixed(1)}% margin`
            });
          }
        }
      });
      
      const sortedAnomalies = anomalies
        .sort((a, b) => {
          const severityOrder = { high: 3, medium: 2, low: 1 };
          if (severityOrder[a.severity] !== severityOrder[b.severity]) {
            return severityOrder[b.severity] - severityOrder[a.severity];
          }
          return b.deviationPercent - a.deviationPercent;
        })
        .slice(0, limit);
      
      const anomalyRate = transactions.length > 0 ? (anomalies.length / transactions.length) * 100 : 0;
      
      logger?.info('Anomaly detection complete', {
        totalTransactions: transactions.length,
        anomaliesDetected: anomalies.length,
        anomalyRate: anomalyRate.toFixed(2) + '%',
        highSeverity: anomalies.filter(a => a.severity === 'high').length
      });
      
      return {
        reportType: 'anomalies' as const,
        summary: {
          totalTransactionsAnalyzed: transactions.length,
          anomaliesDetected: anomalies.length,
          anomalyRate
        },
        anomalies: sortedAnomalies
      };
      
    } else if (reportType === 'quality_summary') {
      // Generate overall data quality summary
      const transactions = getSalesTransactions({
        startDate,
        endDate,
        includeReturns: true,
        includeSamples: true,
        limit: 10000
      });
      
      const issues: Array<{
        issueType: string;
        count: number;
        percentOfTotal: number;
        description: string;
        impact: 'high' | 'medium' | 'low';
      }> = [];
      
      // Check for missing costs
      const missingCost = transactions.filter(t => t.landed_cost_euro === null).length;
      if (missingCost > 0) {
        issues.push({
          issueType: 'missing_cost',
          count: missingCost,
          percentOfTotal: (missingCost / transactions.length) * 100,
          description: 'Transactions with missing landed cost data',
          impact: 'high'
        });
      }
      
      // Check for missing catalogue prices
      const missingCatalogue = transactions.filter(t => t.catalogue_price_trade === null).length;
      if (missingCatalogue > 0) {
        issues.push({
          issueType: 'missing_catalogue_price',
          count: missingCatalogue,
          percentOfTotal: (missingCatalogue / transactions.length) * 100,
          description: 'Transactions with missing catalogue price',
          impact: 'medium'
        });
      }
      
      // Check for missing product descriptions
      const missingDesc = transactions.filter(t => !t.product_description || t.product_description.trim() === '').length;
      if (missingDesc > 0) {
        issues.push({
          issueType: 'missing_description',
          count: missingDesc,
          percentOfTotal: (missingDesc / transactions.length) * 100,
          description: 'Transactions with missing product description',
          impact: 'low'
        });
      }
      
      // Check for zero or negative quantities
      const zeroQty = transactions.filter(t => t.quantity <= 0).length;
      if (zeroQty > 0) {
        issues.push({
          issueType: 'zero_quantity',
          count: zeroQty,
          percentOfTotal: (zeroQty / transactions.length) * 100,
          description: 'Transactions with zero or negative quantity',
          impact: 'high'
        });
      }
      
      // Check for zero or negative prices
      const zeroPrice = transactions.filter(t => t.unit_price <= 0).length;
      if (zeroPrice > 0) {
        issues.push({
          issueType: 'zero_price',
          count: zeroPrice,
          percentOfTotal: (zeroPrice / transactions.length) * 100,
          description: 'Transactions with zero or negative unit price',
          impact: 'high'
        });
      }
      
      // Check for samples
      const samples = transactions.filter(t => t.is_sample === 1).length;
      if (samples > 0) {
        issues.push({
          issueType: 'samples',
          count: samples,
          percentOfTotal: (samples / transactions.length) * 100,
          description: 'Sample transactions (not revenue)',
          impact: 'low'
        });
      }
      
      // Check for returns
      const returns = transactions.filter(t => t.is_return === 1).length;
      if (returns > 0) {
        issues.push({
          issueType: 'returns',
          count: returns,
          percentOfTotal: (returns / transactions.length) * 100,
          description: 'Return transactions (negative revenue)',
          impact: 'medium'
        });
      }
      
      const recordsWithIssues = new Set(
        transactions.filter(t => 
          t.landed_cost_euro === null ||
          t.catalogue_price_trade === null ||
          t.quantity <= 0 ||
          t.unit_price <= 0
        ).map(t => t.invoice_number)
      ).size;
      
      const issueRate = transactions.length > 0 ? (recordsWithIssues / transactions.length) * 100 : 0;
      
      logger?.info('Data quality summary complete', {
        totalRecords: transactions.length,
        recordsWithIssues,
        issueRate: issueRate.toFixed(2) + '%',
        issueTypes: issues.length
      });
      
      return {
        reportType: 'quality_summary' as const,
        summary: {
          totalSalesRecords: transactions.length,
          recordsWithIssues,
          issueRate
        },
        issues: issues.sort((a, b) => b.count - a.count)
      };
      
    } else {
      // orphaned_products
      const products = getProductSales({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        limit: 1000
      });
      
      const orphaned: Array<{
        itemCode: string;
        productDescription: string;
        inSales: boolean;
        hasCost: boolean;
        hasCatalogue: boolean;
        issueType: string;
        transactionCount?: number;
        totalRevenue?: number;
      }> = [];
      
      let missingCostCount = 0;
      let missingCatalogueCount = 0;
      
      products.forEach(p => {
        const hasCost = p.landed_cost_euro !== null;
        const hasCatalogue = p.catalogue_price_trade !== null;
        
        if (!hasCost) missingCostCount++;
        if (!hasCatalogue) missingCatalogueCount++;
        
        if (!hasCost || !hasCatalogue) {
          let issueType = '';
          if (!hasCost && !hasCatalogue) {
            issueType = 'missing_cost_and_catalogue';
          } else if (!hasCost) {
            issueType = 'missing_cost';
          } else {
            issueType = 'missing_catalogue';
          }
          
          orphaned.push({
            itemCode: p.item_code,
            productDescription: p.product_description,
            inSales: true,
            hasCost,
            hasCatalogue,
            issueType,
            transactionCount: p.transaction_count,
            totalRevenue: p.total_revenue
          });
        }
      });
      
      const sortedOrphaned = orphaned
        .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
        .slice(0, limit);
      
      logger?.info('Orphaned products analysis complete', {
        totalProducts: products.length,
        productsWithIssues: orphaned.length,
        missingCost: missingCostCount,
        missingCatalogue: missingCatalogueCount
      });
      
      return {
        reportType: 'orphaned_products' as const,
        summary: {
          totalProducts: products.length,
          productsWithIssues: orphaned.length,
          missingCostCount,
          missingCatalogueCount
        },
        products: sortedOrphaned
      };
    }
  }
});

