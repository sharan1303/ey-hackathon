import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { extractTables } from '../lib/message-parser';

interface DataVisualizerProps {
  content: string;
}

interface TableRowData {
  key: string;
  [key: string]: string;
}

export function DataVisualizer({ content }: DataVisualizerProps) {
  const tables = extractTables(content);

  if (tables.length === 0) {
    return null;
  }

  return (
    <div className="data-visualizer" style={{ marginTop: 16 }}>
      {tables.map((table, tableIndex) => {
        const columns: ColumnsType<TableRowData> = table.header.map((header, index) => ({
          title: header,
          dataIndex: `col_${index}`,
          key: `col_${index}`,
          width: index === 0 ? 200 : undefined,
          ellipsis: true,
          // Add alignment for numeric columns
          align: header.toLowerCase().includes('margin') || 
                 header.toLowerCase().includes('revenue') ||
                 header.toLowerCase().includes('cost') ||
                 header.toLowerCase().includes('price') ||
                 header.toLowerCase().includes('total') ||
                 header.toLowerCase().includes('%') ? 'right' : 'left',
        }));

        const dataSource: TableRowData[] = table.rows.map((row, rowIndex) => {
          const rowData: TableRowData = {
            key: `row_${rowIndex}`,
          };
          
          row.forEach((cell, cellIndex) => {
            rowData[`col_${cellIndex}`] = cell;
          });
          
          return rowData;
        });

        return (
          <div key={tableIndex} style={{ marginBottom: 24 }}>
            <Table
              columns={columns}
              dataSource={dataSource}
              pagination={dataSource.length > 20 ? { pageSize: 20, showSizeChanger: true } : false}
              size="small"
              scroll={{ x: true }}
              bordered
              style={{ 
                backgroundColor: 'white',
                borderRadius: 8,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

