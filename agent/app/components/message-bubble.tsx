import { Bubble } from '@ant-design/x';
import { CopyOutlined } from '@ant-design/icons';
import { message as antdMessage } from 'antd';
import { GPTVisLite, withDefaultChartCode } from '@antv/gpt-vis';
import { DataVisualizer } from './data-visualizer';
import { extractTables } from '../lib/message-parser';

// Create a custom code component with English locale
const CodeBlock = withDefaultChartCode({ locale: 'en-US' });

interface MessageBubbleProps {
  content: string;
  role: 'user' | 'assistant';
  loading?: boolean;
  typing?: boolean;
}

export function MessageBubble({ content, role, loading, typing }: MessageBubbleProps) {
  const isUser = role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    antdMessage.success('Copied to clipboard');
  };

  // Use GPT-Vis for assistant messages with table support, plain text for user messages
  const bubbleContent = isUser ? (
    <div>{content}</div>
  ) : (
    <div className="markdown-content" lang="en">
      <GPTVisLite components={{ code: CodeBlock }}>{content}</GPTVisLite>
      {/* Render tables separately if GPTVis doesn't handle them properly */}
      {extractTables(content).length > 0 && (
        <DataVisualizer content={content} />
      )}
    </div>
  );

  const footer = !isUser && !loading ? (
    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
      <CopyOutlined
        style={{ cursor: 'pointer', fontSize: 14, color: '#999' }}
        onClick={handleCopy}
      />
    </div>
  ) : undefined;

  return (
    <div className={isUser ? 'user-bubble-wrapper' : 'assistant-bubble-wrapper'}>
      <Bubble
        placement={isUser ? 'end' : 'start'}
        content={bubbleContent}
        footer={footer}
        loading={loading}
        typing={typing && !loading ? { step: 5, interval: 20 } : false}
        variant={isUser ? 'filled' : 'outlined'}
        styles={{
          content: isUser
            ? {
                background: '#1677ff',
                color: 'white',
                borderRadius: 12,
                padding: '12px 16px',
              }
            : {
                background: 'transparent',
                color: '#262626',
                border: 'none',
                padding: 0,
              },
        }}
      />
    </div>
  );
}

