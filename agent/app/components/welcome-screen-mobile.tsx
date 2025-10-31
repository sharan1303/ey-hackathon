'use client';

import Image from 'next/image';
import { Sender } from '@ant-design/x';

interface MobileWelcomeScreenProps {
  content: string;
  onContentChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isLoading: boolean;
}

export function MobileWelcomeScreen({
  content,
  onContentChange,
  onSubmit,
  isLoading,
}: MobileWelcomeScreenProps) {
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
        justifyContent: 'space-between',
        textAlign: 'center',
        padding: 0,
      }}
    >
      {/* Top section with logo and text */}
      <div style={{ width: '100%', padding: '40px 16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 150, marginBottom: 24 }}>
          <Image
            src="/volt.svg"
            alt="Logo"
            width={48}
            height={48}
            style={{
              objectFit: 'contain',
            }}
          />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 32, marginTop: 0 }}>
          Welcome, how can I help?
        </h1>
        <p style={{ fontSize: 15, color: '#333', lineHeight: '1.6', marginBottom: 12 }}>
          I&apos;m here to help you analyse pricing, profitability, and identify opportunities in
          your sales data.
        </p>
        <p style={{ fontSize: 15, color: '#333', lineHeight: '1.6', marginBottom: 0 }}>
          Ask me anything about margins, customer performance, or product pricing.
        </p>
      </div>

      {/* Bottom section with suggestions and input */}
      <div style={{ width: '100%', padding: '0 5px 16px' }}>
        {/* Horizontal Scrollable Suggestions */}
        <div
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            display: 'flex',
            gap: 8,
            marginBottom: 16,
            paddingBottom: 4,
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion}
              onClick={() => onSubmit(suggestion)}
              style={{
                padding: '10px 16px',
                background: 'white',
                border: '1px solid #d1d5db',
                borderRadius: 24,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                fontSize: 14,
                color: '#1f2937',
                flexShrink: 0,
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>

        {/* Input */}
        <Sender
          value={content}
          onChange={onContentChange}
          onSubmit={onSubmit}
          placeholder="Press Shift + Enter to send message"
          loading={isLoading}
        />
      </div>
    </div>
  );
}

