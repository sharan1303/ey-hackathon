import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { 
  getSalesTransactions,
  calculateMarginPercent
} from '../lib/queries';

export const trendsForecastingTool = createTool({
  id: 'trends-forecasting',
  description: `Analyze sales trends over time, seasonality patterns, growth rates, and forecasts.
  
  Use this tool when asked about:
  - Sales trends over time (daily, weekly, monthly, quarterly, yearly)
  - Period-over-period growth analysis
  - Seasonal patterns and cyclical trends
  - Revenue or margin forecasting
  - Year-over-year comparisons
  - Business performance trajectory
  
  Provides strategic insights for planning and forecasting future performance.`,
  
  inputSchema: z.object({
    analysisType: z.enum(['sales_trend', 'seasonality', 'growth', 'forecast', 'margin_trend'])
      .describe('Type of trend/forecast analysis to perform'),
    groupBy: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional().default('month')
      .describe('Time period granularity for grouping'),
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
    comparisonType: z.enum(['previous_period', 'year_over_year', 'custom']).optional()
      .describe('Type of comparison for growth analysis'),
    comparisonStartDate: z.string().optional().describe('Comparison period start (for custom comparison)'),
    comparisonEndDate: z.string().optional().describe('Comparison period end (for custom comparison)'),
    forecastPeriods: z.number().optional().default(3)
      .describe('Number of future periods to forecast'),
    includeReturns: z.boolean().optional().default(false).describe('Include returns in analysis')
  }),
  
  outputSchema: z.union([
    // Sales trend output
    z.object({
      analysisType: z.literal('sales_trend'),
      summary: z.object({
        totalRevenue: z.number(),
        totalMargin: z.number(),
        avgMarginPercent: z.number(),
        periodCount: z.number(),
        overallGrowthRate: z.number()
      }),
      periods: z.array(z.object({
        period: z.string(),
        revenue: z.number(),
        cost: z.number(),
        margin: z.number(),
        marginPercent: z.number(),
        transactionCount: z.number(),
        uniqueCustomers: z.number(),
        uniqueProducts: z.number(),
        avgOrderValue: z.number(),
        growthRatePercent: z.number().optional()
      }))
    }),
    // Seasonality output
    z.object({
      analysisType: z.literal('seasonality'),
      summary: z.object({
        totalPeriods: z.number(),
        avgRevenue: z.number(),
        highestSeasonalityIndex: z.number(),
        lowestSeasonalityIndex: z.number()
      }),
      patterns: z.array(z.object({
        periodKey: z.string(),
        avgRevenue: z.number(),
        minRevenue: z.number(),
        maxRevenue: z.number(),
        stdDeviation: z.number(),
        transactionCount: z.number(),
        seasonalityIndex: z.number(),
        interpretation: z.string()
      }))
    }),
    // Growth output
    z.object({
      analysisType: z.literal('growth'),
      summary: z.object({
        comparisonType: z.string(),
        currentPeriodRevenue: z.number(),
        comparisonPeriodRevenue: z.number(),
        overallGrowthPercent: z.number()
      }),
      metrics: z.array(z.object({
        metric: z.string(),
        currentValue: z.number(),
        comparisonValue: z.number(),
        absoluteChange: z.number(),
        percentChange: z.number(),
        trend: z.enum(['up', 'down', 'flat'])
      }))
    }),
    // Forecast output
    z.object({
      analysisType: z.literal('forecast'),
      summary: z.object({
        historicalPeriods: z.number(),
        forecastPeriods: z.number(),
        avgHistoricalRevenue: z.number(),
        totalForecastedRevenue: z.number()
      }),
      forecasts: z.array(z.object({
        period: z.string(),
        forecastedRevenue: z.number(),
        forecastedMargin: z.number(),
        confidenceLevel: z.enum(['high', 'medium', 'low']),
        basedOnPeriods: z.number()
      }))
    }),
    // Margin trend output
    z.object({
      analysisType: z.literal('margin_trend'),
      summary: z.object({
        totalRevenue: z.number(),
        totalMargin: z.number(),
        avgMarginPercent: z.number(),
        periodCount: z.number(),
        marginTrend: z.enum(['improving', 'declining', 'stable'])
      }),
      periods: z.array(z.object({
        period: z.string(),
        revenue: z.number(),
        cost: z.number(),
        margin: z.number(),
        marginPercent: z.number(),
        transactionCount: z.number()
      }))
    })
  ]),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { 
      analysisType, 
      groupBy,
      startDate, 
      endDate,
      comparisonType,
      comparisonStartDate,
      comparisonEndDate,
      forecastPeriods,
      includeReturns
    } = context;
    
    logger?.info('Executing trends-forecasting tool', {
      analysisType,
      groupBy,
      dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'default (last 12 months)',
      forecastPeriods
    });
    
    // Helper function to format period key
    const getPeriodKey = (date: Date, groupBy: string): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      
      switch (groupBy) {
        case 'day': return `${year}-${month}-${day}`;
        case 'week': {
          const weekNum = Math.ceil((date.getDate() + new Date(year, date.getMonth(), 1).getDay()) / 7);
          return `${year}-W${String(weekNum).padStart(2, '0')}`;
        }
        case 'month': return `${year}-${month}`;
        case 'quarter': return `${year}-Q${quarter}`;
        case 'year': return String(year);
        default: return `${year}-${month}`;
      }
    };
    
    if (analysisType === 'sales_trend') {
      const transactions = await getSalesTransactions({
        startDate,
        endDate,
        includeReturns,
        includeSamples: false,
        limit: 20000
      });
      
      // Group by period
      const periodMap = new Map<string, typeof transactions>();
      transactions.forEach(t => {
        const date = new Date(t.invoice_date);
        const periodKey = getPeriodKey(date, groupBy!);
        
        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, []);
        }
        periodMap.get(periodKey)!.push(t);
      });
      
      const periods = Array.from(periodMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, txns], index, arr) => {
          const revenue = txns.reduce((sum, t) => sum + t.line_total, 0);
          const cost = txns.reduce((sum, t) => 
            sum + (t.landed_cost_euro ? t.quantity * t.landed_cost_euro : 0), 0);
          const margin = revenue - cost;
          const marginPercent = calculateMarginPercent(revenue, cost);
          
          const uniqueCustomers = new Set(txns.map(t => t.customer_code)).size;
          const uniqueProducts = new Set(txns.map(t => t.item_code)).size;
          const avgOrderValue = revenue / txns.length;
          
          // Calculate growth rate vs previous period
          let growthRatePercent: number | undefined = undefined;
          if (index > 0) {
            const prevRevenue = arr[index - 1][1].reduce((sum, t) => sum + t.line_total, 0);
            growthRatePercent = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
          }
          
          return {
            period,
            revenue,
            cost,
            margin,
            marginPercent,
            transactionCount: txns.length,
            uniqueCustomers,
            uniqueProducts,
            avgOrderValue,
            growthRatePercent
          };
        });
      
      const totalRevenue = periods.reduce((sum, p) => sum + p.revenue, 0);
      const totalMargin = periods.reduce((sum, p) => sum + p.margin, 0);
      const avgMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
      
      const overallGrowthRate = periods.length > 1 && periods[0].revenue > 0
        ? ((periods[periods.length - 1].revenue - periods[0].revenue) / periods[0].revenue) * 100
        : 0;
      
      logger?.info('Sales trend analysis complete', {
        periodCount: periods.length,
        totalRevenue: totalRevenue.toFixed(2),
        avgMarginPercent: avgMarginPercent.toFixed(2) + '%',
        overallGrowth: overallGrowthRate.toFixed(2) + '%'
      });
      
      return {
        analysisType: 'sales_trend' as const,
        summary: {
          totalRevenue,
          totalMargin,
          avgMarginPercent,
          periodCount: periods.length,
          overallGrowthRate
        },
        periods
      };
      
    } else if (analysisType === 'seasonality') {
      const transactions = await getSalesTransactions({
        startDate,
        endDate,
        includeReturns,
        includeSamples: false,
        limit: 20000
      });
      
      // Group by seasonal period (month, quarter, or day of week)
      const seasonalMap = new Map<string, number[]>();
      
      transactions.forEach(t => {
        const date = new Date(t.invoice_date);
        let key: string;
        
        if (groupBy === 'month') {
          key = date.toLocaleString('en-US', { month: 'long' });
        } else if (groupBy === 'quarter') {
          key = `Q${Math.floor(date.getMonth() / 3) + 1}`;
        } else {
          key = date.toLocaleString('en-US', { weekday: 'long' });
        }
        
        if (!seasonalMap.has(key)) {
          seasonalMap.set(key, []);
        }
        seasonalMap.get(key)!.push(t.line_total);
      });
      
      const avgOverall = transactions.reduce((sum, t) => sum + t.line_total, 0) / 
        Math.max(1, seasonalMap.size);
      
      const patterns = Array.from(seasonalMap.entries())
        .map(([periodKey, revenues]) => {
          const avgRevenue = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
          const minRevenue = Math.min(...revenues);
          const maxRevenue = Math.max(...revenues);
          
          // Calculate standard deviation
          const variance = revenues.reduce((sum, r) => sum + Math.pow(r - avgRevenue, 2), 0) / revenues.length;
          const stdDeviation = Math.sqrt(variance);
          
          // Seasonality index (vs overall average)
          const seasonalityIndex = avgOverall > 0 ? (avgRevenue / avgOverall) : 1;
          
          let interpretation = 'Average';
          if (seasonalityIndex > 1.2) interpretation = 'High Season';
          else if (seasonalityIndex < 0.8) interpretation = 'Low Season';
          
          return {
            periodKey,
            avgRevenue,
            minRevenue,
            maxRevenue,
            stdDeviation,
            transactionCount: revenues.length,
            seasonalityIndex,
            interpretation
          };
        })
        .sort((a, b) => b.seasonalityIndex - a.seasonalityIndex);
      
      const highestIndex = patterns.length > 0 ? patterns[0].seasonalityIndex : 1;
      const lowestIndex = patterns.length > 0 ? patterns[patterns.length - 1].seasonalityIndex : 1;
      
      logger?.info('Seasonality analysis complete', {
        totalPeriods: patterns.length,
        avgRevenue: avgOverall.toFixed(2),
        highestIndex: highestIndex.toFixed(2),
        lowestIndex: lowestIndex.toFixed(2)
      });
      
      return {
        analysisType: 'seasonality' as const,
        summary: {
          totalPeriods: patterns.length,
          avgRevenue: avgOverall,
          highestSeasonalityIndex: highestIndex,
          lowestSeasonalityIndex: lowestIndex
        },
        patterns
      };
      
    } else if (analysisType === 'growth') {
      const currentTransactions = await getSalesTransactions({
        startDate,
        endDate,
        includeReturns,
        includeSamples: false,
        limit: 20000
      });
      
      // Determine comparison period
      let compStart: string | undefined = comparisonStartDate;
      let compEnd: string | undefined = comparisonEndDate;
      
      if (comparisonType === 'previous_period' && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const duration = end.getTime() - start.getTime();
        
        const compEndDate = new Date(start.getTime() - 1);
        const compStartDate = new Date(compEndDate.getTime() - duration);
        
        compStart = compStartDate.toISOString().split('T')[0];
        compEnd = compEndDate.toISOString().split('T')[0];
      } else if (comparisonType === 'year_over_year' && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        compStart = new Date(start.setFullYear(start.getFullYear() - 1)).toISOString().split('T')[0];
        compEnd = new Date(end.setFullYear(end.getFullYear() - 1)).toISOString().split('T')[0];
      }
      
      const comparisonTransactions = compStart && compEnd ? await getSalesTransactions({
        startDate: compStart,
        endDate: compEnd,
        includeReturns,
        includeSamples: false,
        limit: 20000
      }) : [];
      
      // Calculate metrics
      const calcMetrics = (txns: typeof currentTransactions) => {
        const revenue = txns.reduce((sum, t) => sum + t.line_total, 0);
        const cost = txns.reduce((sum, t) => 
          sum + (t.landed_cost_euro ? t.quantity * t.landed_cost_euro : 0), 0);
        const margin = revenue - cost;
        const transactionCount = txns.length;
        const uniqueCustomers = new Set(txns.map(t => t.customer_code)).size;
        const uniqueProducts = new Set(txns.map(t => t.item_code)).size;
        const avgOrderValue = revenue / Math.max(1, transactionCount);
        
        return { revenue, cost, margin, transactionCount, uniqueCustomers, uniqueProducts, avgOrderValue };
      };
      
      const current = calcMetrics(currentTransactions);
      const comparison = calcMetrics(comparisonTransactions);
      
      const metrics = [
        {
          metric: 'Revenue',
          currentValue: current.revenue,
          comparisonValue: comparison.revenue,
          absoluteChange: current.revenue - comparison.revenue,
          percentChange: comparison.revenue > 0 ? ((current.revenue - comparison.revenue) / comparison.revenue) * 100 : 0,
          trend: (current.revenue > comparison.revenue ? 'up' : current.revenue < comparison.revenue ? 'down' : 'flat') as 'up' | 'down' | 'flat'
        },
        {
          metric: 'Margin',
          currentValue: current.margin,
          comparisonValue: comparison.margin,
          absoluteChange: current.margin - comparison.margin,
          percentChange: comparison.margin > 0 ? ((current.margin - comparison.margin) / comparison.margin) * 100 : 0,
          trend: (current.margin > comparison.margin ? 'up' : current.margin < comparison.margin ? 'down' : 'flat') as 'up' | 'down' | 'flat'
        },
        {
          metric: 'Transactions',
          currentValue: current.transactionCount,
          comparisonValue: comparison.transactionCount,
          absoluteChange: current.transactionCount - comparison.transactionCount,
          percentChange: comparison.transactionCount > 0 ? ((current.transactionCount - comparison.transactionCount) / comparison.transactionCount) * 100 : 0,
          trend: (current.transactionCount > comparison.transactionCount ? 'up' : current.transactionCount < comparison.transactionCount ? 'down' : 'flat') as 'up' | 'down' | 'flat'
        },
        {
          metric: 'Unique Customers',
          currentValue: current.uniqueCustomers,
          comparisonValue: comparison.uniqueCustomers,
          absoluteChange: current.uniqueCustomers - comparison.uniqueCustomers,
          percentChange: comparison.uniqueCustomers > 0 ? ((current.uniqueCustomers - comparison.uniqueCustomers) / comparison.uniqueCustomers) * 100 : 0,
          trend: (current.uniqueCustomers > comparison.uniqueCustomers ? 'up' : current.uniqueCustomers < comparison.uniqueCustomers ? 'down' : 'flat') as 'up' | 'down' | 'flat'
        },
        {
          metric: 'Average Order Value',
          currentValue: current.avgOrderValue,
          comparisonValue: comparison.avgOrderValue,
          absoluteChange: current.avgOrderValue - comparison.avgOrderValue,
          percentChange: comparison.avgOrderValue > 0 ? ((current.avgOrderValue - comparison.avgOrderValue) / comparison.avgOrderValue) * 100 : 0,
          trend: (current.avgOrderValue > comparison.avgOrderValue ? 'up' : current.avgOrderValue < comparison.avgOrderValue ? 'down' : 'flat') as 'up' | 'down' | 'flat'
        }
      ];
      
      const overallGrowthPercent = comparison.revenue > 0 
        ? ((current.revenue - comparison.revenue) / comparison.revenue) * 100
        : 0;
      
      logger?.info('Growth analysis complete', {
        comparisonType: comparisonType || 'custom',
        currentRevenue: current.revenue.toFixed(2),
        comparisonRevenue: comparison.revenue.toFixed(2),
        growthPercent: overallGrowthPercent.toFixed(2) + '%'
      });
      
      return {
        analysisType: 'growth' as const,
        summary: {
          comparisonType: comparisonType || 'custom',
          currentPeriodRevenue: current.revenue,
          comparisonPeriodRevenue: comparison.revenue,
          overallGrowthPercent
        },
        metrics
      };
      
    } else if (analysisType === 'forecast') {
      const transactions = await getSalesTransactions({
        startDate,
        endDate,
        includeReturns,
        includeSamples: false,
        limit: 20000
      });
      
      // Group by period for historical data
      const periodMap = new Map<string, typeof transactions>();
      transactions.forEach(t => {
        const date = new Date(t.invoice_date);
        const periodKey = getPeriodKey(date, groupBy!);
        
        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, []);
        }
        periodMap.get(periodKey)!.push(t);
      });
      
      const historicalPeriods = Array.from(periodMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, txns]) => {
          const revenue = txns.reduce((sum, t) => sum + t.line_total, 0);
          const cost = txns.reduce((sum, t) => 
            sum + (t.landed_cost_euro ? t.quantity * t.landed_cost_euro : 0), 0);
          return { period, revenue, margin: revenue - cost };
        });
      
      // Simple moving average forecast
      const avgRevenue = historicalPeriods.reduce((sum, p) => sum + p.revenue, 0) / Math.max(1, historicalPeriods.length);
      const avgMargin = historicalPeriods.reduce((sum, p) => sum + p.margin, 0) / Math.max(1, historicalPeriods.length);
      
      // Calculate trend (simple linear)
      const recentPeriods = historicalPeriods.slice(-3);
      const recentAvgRevenue = recentPeriods.reduce((sum, p) => sum + p.revenue, 0) / Math.max(1, recentPeriods.length);
      const growthFactor = avgRevenue > 0 ? recentAvgRevenue / avgRevenue : 1;
      
      const forecasts: Array<{
        period: string;
        forecastedRevenue: number;
        forecastedMargin: number;
        confidenceLevel: 'high' | 'medium' | 'low';
        basedOnPeriods: number;
      }> = [];
      
      const lastPeriod = historicalPeriods.length > 0 ? historicalPeriods[historicalPeriods.length - 1].period : '';
      
      for (let i = 1; i <= forecastPeriods!; i++) {
        const forecastedRevenue = avgRevenue * growthFactor;
        const forecastedMargin = avgMargin * growthFactor;
        
        // Confidence decreases with forecast distance
        let confidenceLevel: 'high' | 'medium' | 'low' = 'high';
        if (i > 2) confidenceLevel = 'low';
        else if (i > 1) confidenceLevel = 'medium';
        
        forecasts.push({
          period: `${lastPeriod}+${i}`,
          forecastedRevenue,
          forecastedMargin,
          confidenceLevel,
          basedOnPeriods: historicalPeriods.length
        });
      }
      
      const totalForecastedRevenue = forecasts.reduce((sum, f) => sum + f.forecastedRevenue, 0);
      
      logger?.info('Forecast analysis complete', {
        historicalPeriods: historicalPeriods.length,
        forecastPeriods: forecasts.length,
        avgHistoricalRevenue: avgRevenue.toFixed(2),
        totalForecastedRevenue: totalForecastedRevenue.toFixed(2)
      });
      
      return {
        analysisType: 'forecast' as const,
        summary: {
          historicalPeriods: historicalPeriods.length,
          forecastPeriods: forecasts.length,
          avgHistoricalRevenue: avgRevenue,
          totalForecastedRevenue
        },
        forecasts
      };
      
    } else {
      // margin_trend
      const transactions = await getSalesTransactions({
        startDate,
        endDate,
        includeReturns,
        includeSamples: false,
        limit: 20000
      });
      
      // Group by period
      const periodMap = new Map<string, typeof transactions>();
      transactions.forEach(t => {
        const date = new Date(t.invoice_date);
        const periodKey = getPeriodKey(date, groupBy!);
        
        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, []);
        }
        periodMap.get(periodKey)!.push(t);
      });
      
      const periods = Array.from(periodMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, txns]) => {
          const revenue = txns.reduce((sum, t) => sum + t.line_total, 0);
          const cost = txns.reduce((sum, t) => 
            sum + (t.landed_cost_euro ? t.quantity * t.landed_cost_euro : 0), 0);
          const margin = revenue - cost;
          const marginPercent = calculateMarginPercent(revenue, cost);
          
          return {
            period,
            revenue,
            cost,
            margin,
            marginPercent,
            transactionCount: txns.length
          };
        });
      
      const totalRevenue = periods.reduce((sum, p) => sum + p.revenue, 0);
      const totalMargin = periods.reduce((sum, p) => sum + p.margin, 0);
      const avgMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
      
      // Determine trend
      let marginTrend: 'improving' | 'declining' | 'stable' = 'stable';
      if (periods.length >= 3) {
        const first = periods[0].marginPercent;
        const last = periods[periods.length - 1].marginPercent;
        const diff = last - first;
        
        if (diff > 2) marginTrend = 'improving';
        else if (diff < -2) marginTrend = 'declining';
      }
      
      logger?.info('Margin trend analysis complete', {
        periodCount: periods.length,
        totalRevenue: totalRevenue.toFixed(2),
        avgMarginPercent: avgMarginPercent.toFixed(2) + '%',
        marginTrend
      });
      
      return {
        analysisType: 'margin_trend' as const,
        summary: {
          totalRevenue,
          totalMargin,
          avgMarginPercent,
          periodCount: periods.length,
          marginTrend
        },
        periods
      };
    }
  }
});

