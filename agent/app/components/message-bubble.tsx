import { Bubble } from '@ant-design/x';
import { CopyOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import { message as antdMessage } from 'antd';
import { GPTVis } from '@antv/gpt-vis';

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

  const avatar = isUser ? (
    <UserOutlined style={{ fontSize: 20 }} />
  ) : (
    <RobotOutlined style={{ fontSize: 20 }} />
  );

  const avatarStyle = isUser
    ? { background: '#1677ff' }
    : { background: '#f0f0f0', color: '#1677ff' };

  // Use GPT-Vis for assistant messages, plain text for user messages
  const bubbleContent = isUser ? (
    <div>{content}</div>
  ) : (
    <div className="markdown-content" lang="en">
      <GPTVis>{content}</GPTVis>
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
    <Bubble
      avatar={{
        icon: avatar,
        style: avatarStyle,
      }}
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
              background: 'white',
              color: '#262626',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '12px 16px',
            },
      }}
    />
  );
}

