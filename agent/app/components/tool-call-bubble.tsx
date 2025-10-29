'use client';

import { useState } from 'react';
import { Collapse, message as antdMessage } from 'antd';
import { CopyOutlined, RightOutlined } from '@ant-design/icons';
import type { ToolCallData } from '../lib/chat-api';

interface ToolCallBubbleProps {
  toolCall: ToolCallData;
}

export function ToolCallBubble({ toolCall }: ToolCallBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    antdMessage.success(`${label} copied to clipboard`);
  };

  const formatJSON = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const items = [
    {
      key: 'arguments',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>Tool arguments</span>
          <CopyOutlined
            style={{ cursor: 'pointer', fontSize: 14, color: '#999', paddingLeft: 10}}
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(formatJSON(toolCall.arguments), 'Arguments');
            }}
          />
        </div>
      ),
      children: (
        <pre
          style={{
            margin: 0,
            padding: 12,
            background: '#fafafa',
            borderRadius: 4,
            fontSize: 12,
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            overflow: 'auto',
            maxHeight: 400,
          }}
        >
          {formatJSON(toolCall.arguments)}
        </pre>
      ),
    },
  ];

  // Only show result section if we have a result
  if (toolCall.result !== undefined) {
    items.push({
      key: 'result',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>Tool result</span>
          <CopyOutlined
            style={{ cursor: 'pointer', fontSize: 14, color: '#999' }}
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(formatJSON(toolCall.result), 'Result');
            }}
          />
        </div>
      ),
      children: (
        <pre
          style={{
            margin: 0,
            padding: 12,
            background: '#fafafa',
            borderRadius: 4,
            fontSize: 12,
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            overflow: 'auto',
            maxHeight: 400,
          }}
        >
          {formatJSON(toolCall.result)}
        </pre>
      ),
    });
  }

  return (
    <div
      style={{
        background: '#f5f5f5',
        border: '1px solid #e0e0e0',
        borderRadius: 8,
        overflow: 'hidden',
        maxWidth: 700,
      }}
    >
      {/* Clickable header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          fontSize: 14,
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#ebebeb';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <RightOutlined
          style={{
            fontSize: 12,
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />
        <span style={{ fontSize: 15 }}>⚙️</span>
        <span style={{ fontWeight: 400 }}>{toolCall.toolName}</span>
        {toolCall.status === 'pending' && (
          <span
            style={{
              fontSize: 12,
              color: '#999',
              fontWeight: 100,
              marginLeft: 'auto',
            }}
          >
            Running...
          </span>
        )}
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div style={{ padding: '0 16px 12px 16px' }}>
          <Collapse
            items={items}
            activeKey={activeKeys}
            onChange={(keys) => setActiveKeys(keys as string[])}
            bordered={false}
            expandIcon={({ isActive }) => (
              <RightOutlined
                style={{
                  fontSize: 12,
                  transition: 'transform 0.2s',
                  transform: isActive ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              />
            )}
            style={{
              background: 'transparent',
            }}
          />
        </div>
      )}
    </div>
  );
}

