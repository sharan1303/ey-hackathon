import { Bubble } from '@ant-design/x';
import { CopyOutlined } from '@ant-design/icons';
import { App } from 'antd';
import { GPTVisLite, withDefaultChartCode } from '@antv/gpt-vis';
import { ToolCallBubble } from './tool-call-bubble';
import type { ToolCallData } from '../lib/chat-api';

// Create a custom code component with English locale
const CodeBlock = withDefaultChartCode({ locale: 'en-US' });

interface MessageBubbleProps {
  content: string;
  role: 'user' | 'assistant' | 'tool-call';
  loading?: boolean;
  typing?: boolean;
  toolCall?: ToolCallData;
}

export function MessageBubble({ content, role, loading, typing, toolCall }: MessageBubbleProps) {
  const { message } = App.useApp();
  const isUser = role === 'user';
  const isToolCall = role === 'tool-call';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    message.success('Copied to clipboard');
  };

  // If this is a tool call message, render the ToolCallBubble component
  if (isToolCall && toolCall) {
    return (
      <div className="tool-call-bubble-wrapper">
        <ToolCallBubble toolCall={toolCall} />
      </div>
    );
  }

  // Use GPT-Vis for assistant messages, plain text for user messages
  const bubbleContent = isUser ? (
    <div>{content}</div>
  ) : (
    <div className="markdown-content" lang="en">
      <GPTVisLite components={{ code: CodeBlock }}>{content}</GPTVisLite>
    </div>
  );

  const footer = !isUser && !loading ? (
    <div style={{ display: 'flex', gap: 8 }}>
      <CopyOutlined
        style={{ cursor: 'pointer', fontSize: 20, color: '#999' }}
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

