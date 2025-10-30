export interface ParsedMessage {
  text: string;
  hasTable: boolean;
  hasCode: boolean;
  hasMarkdown: boolean;
}

/**
 * Parses a message to detect special content types
 */
export function parseMessage(content: string): ParsedMessage {
  const hasTable = content.includes('|') && content.split('\n').some(line => line.trim().startsWith('|'));
  const hasCode = content.includes('```') || content.includes('`');
  const hasMarkdown = content.includes('**') || content.includes('*') || content.includes('#');

  return {
    text: content,
    hasTable,
    hasCode,
    hasMarkdown: hasMarkdown || hasTable || hasCode,
  };
}

/**
 * Formats currency values
 */
export function formatCurrency(value: number, currency = '€'): string {
  return `${currency}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats percentage values
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Extracts tables from markdown content
 */
export function extractTables(content: string): { header: string[], rows: string[][] }[] {
  const tables: { header: string[], rows: string[][] }[] = [];
  const lines = content.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Check if line looks like a table header
    if (line.startsWith('|') && line.endsWith('|')) {
      const nextLine = lines[i + 1]?.trim();
      
      // Check if next line is separator (e.g., |---|---|)
      if (nextLine && nextLine.startsWith('|') && nextLine.includes('---')) {
        const header = line
          .split('|')
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0);
        
        const rows: string[][] = [];
        
        // Skip separator line
        i += 2;
        
        // Collect table rows
        while (i < lines.length) {
          const rowLine = lines[i].trim();
          if (!rowLine.startsWith('|') || !rowLine.endsWith('|')) {
            break;
          }
          
          const row = rowLine
            .split('|')
            .map(cell => cell.trim())
            .filter(cell => cell.length > 0);
          
          if (row.length > 0) {
            rows.push(row);
          }
          
          i++;
        }
        
        if (header.length > 0 && rows.length > 0) {
          tables.push({ header, rows });
        }
        
        continue;
      }
    }
    
    i++;
  }
  
  return tables;
}

/**
 * Generates a title from the first message
 */
export function generateTitle(message: string, maxLength = 50): string {
  const cleaned = message.trim().replace(/\n+/g, ' ');
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  return cleaned.substring(0, maxLength - 3) + '...';
}

