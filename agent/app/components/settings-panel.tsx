'use client';

import { useState, useEffect } from 'react';
import { Switch, Select } from 'antd';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const tools = [
  { name: 'executive-summary', label: 'executive-summary' },
  { name: 'margin-analysis', label: 'margin-analysis' },
  { name: 'customer-analysis', label: 'customer-analysis' },
  { name: 'pricing-analysis', label: 'pricing-analysis' },
  { name: 'discount-returns', label: 'discount-returns' },
  { name: 'product-analysis', label: 'product-analysis' },
  { name: 'data-quality', label: 'data-quality' },
  { name: 'trends-forecasting', label: 'trends-forecasting' },
];

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [provider, setProvider] = useState('azure');
  const [model, setModel] = useState('gpt-5');
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const systemPrompt = `You are a financial analysis expert specialising in pricing and profitability for Voltura Group.

- Your Role

You help analyse sales data to answer questions about:
- Profit margins and identify negative margins (products/ customers sold below cost)
- Customer and product profitability rankings
- Pricing issues and opportunities
- Incentive summaries and problem areas requiring immediate attention

- Database Information
- **Data Coverage**: 736,391 transactions from May – **Customers**: 2,076 customers tracked`;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            transition: 'opacity 0.3s ease',
          }}
          onClick={onClose}
        />
      )}

      {/* Settings Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: isMobile ? '100vw' : 420,
          background: 'white',
          boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '0 24px',
            borderBottom: '1px solid #e5e7eb',
            background: '#1e293b',
            color: 'white',
            height: 56,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: '#334155',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6m0 6v6m9.66-9.66l-5.197 5.197M6.464 6.464L1.267 1.267M23 12h-6m-6 0H1m20.732 6.732l-5.197-5.197M6.464 17.536L1.267 22.733" />
                </svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                  Settings
                </h2>
              </div>
            </div>
            
            {/* Close button for mobile */}
            {isMobile && (
              <button
                onClick={onClose}
                aria-label="Close settings"
                style={{
                  width: 32,
                  height: 32,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  transition: 'background 0.2s',
                  color: 'white',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}
        >
          {/* Model Section */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
              </svg>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Model</h3>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#666' }}>
              Choose a provider and model for the agent
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Select
                value={provider}
                onChange={setProvider}
                style={{ flex: 1 }}
                options={[
                  { value: 'azure', label: 'azure' },
                  { value: 'openai', label: 'openai' },
                ]}
              />
              <Select
                value={model}
                onChange={setModel}
                style={{ flex: 1 }}
                options={[
                  { value: 'gpt-5', label: 'gpt-5' },
                  { value: 'gpt-5-mini', label: 'gpt-5-mini' },
                  { value: 'gpt-4.1', label: 'gpt-4.1' },
                  { value: 'gpt-4', label: 'gpt-4' },
                  { value: 'gpt-4o', label: 'gpt-4o' },
                ]}
              />
            </div>
          </div>

          {/* Memory Section */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Memory</h3>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#666' }}>
              Enable memory and chat history
            </p>
            <Switch
              checked={memoryEnabled}
              onChange={setMemoryEnabled}
              style={{ background: memoryEnabled ? '#1677ff' : '#ccc' }}
            />
          </div>

          {/* Tools Section */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Tools</h3>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#666' }}>
              Tools available for queries and analysis
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#64748b',
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                  {tool.label}
                </div>
              ))}
            </div>
          </div>

          {/* System Prompt Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M8 10h8M8 14h8" />
              </svg>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>System prompt</h3>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#666' }}>
              Control your agent&apos;s behaviour and responses
            </p>
            <div
              style={{
                padding: 12,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 12,
                color: '#64748b',
                lineHeight: '1.6',
                maxHeight: 300,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {systemPrompt}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

