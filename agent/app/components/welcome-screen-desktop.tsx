'use client';

import Image from 'next/image';
import { Sender } from '@ant-design/x';

interface DesktopWelcomeScreenProps {
  content: string;
  onContentChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isLoading: boolean;
}

export function DesktopWelcomeScreen({
  content,
  onContentChange,
  onSubmit,
  isLoading,
}: DesktopWelcomeScreenProps) {
  const suggestions = [
    'What was the margin trend for 2024?',
    'How did discount % affect sales volume?',
    'At what price should the customer Gripz Isla Ltd (Belfast) charge for the product IEZ27ITY7949?',
    'What are the top 10 products by margin?',
    'Identify products with pricing inconsistency in 2023',
  ];

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 0,
      }}
    >
      <div style={{ maxWidth: 900, width: '100%', padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Image
            src="/volt.svg"
            alt="Logo"
            width={64}
            height={64}
            style={{
              objectFit: 'contain',
            }}
          />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 16 }}>
          Welcome, how can I help?
        </h1>
        <p style={{ fontSize: 16, color: '#666', lineHeight: '1.5' }}>
          I&apos;m here to help you analyse pricing, profitability, and identify opportunities in
          your sales data.
        </p>
        <p style={{ fontSize: 16, color: '#666', marginBottom: 20, lineHeight: '1.5' }}>
          Ask me anything about margins, customer performance, or product pricing.
        </p>

        {/* Centered Input */}
        <div style={{ marginBottom: 32 }}>
          <Sender
            value={content}
            onChange={onContentChange}
            onSubmit={onSubmit}
            placeholder="Press Shift + Enter to send message"
            loading={isLoading}
            style={{
              maxWidth: 900,
              margin: '0 auto',
            }}
          />
        </div>

        {/* Horizontal Scrollable Suggestions */}
        <div
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            display: 'flex',
            gap: 12,
            paddingBottom: 8,
            scrollbarWidth: 'thin',
          }}
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion}
              onClick={() => onSubmit(suggestion)}
              style={{
                padding: '10px 16px',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 20,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                fontSize: 14,
                color: '#262626',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#1677ff';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(22, 119, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

