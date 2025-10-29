import { Table } from 'antd';
import { extractTables } from '../lib/message-parser';

interface DataVisualizerProps {
  content: string;
}

export function DataVisualizer({ content }: DataVisualizerProps) {
  const tables = extractTables(content);

  if (tables.length === 0) {
    return null;
  }

  return (
    <div className="data-visualizer">
      {tables.map((table, tableIndex) => {
        const columns = table.header.map((header, index) => ({
          title: header,
          dataIndex: `col_${index}`,
          key: `col_${index}`,
          width: index === 0 ? 200 : undefined,
        }));

        const dataSource = table.rows.map((row, rowIndex) => {
          const rowData: Record<string, string> = {
            key: `row_${rowIndex}`,
          };
          
          row.forEach((cell, cellIndex) => {
            rowData[`col_${cellIndex}`] = cell;
          });
          
          return rowData;
        });

        return (
          <Table
            key={tableIndex}
            columns={columns}
            dataSource={dataSource}
            pagination={false}
            size="small"
            scroll={{ x: true }}
            style={{ marginTop: 16, marginBottom: 16 }}
          />
        );
      })}
    </div>
  );
}

