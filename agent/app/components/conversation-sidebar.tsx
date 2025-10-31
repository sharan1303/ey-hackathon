'use client';

import { PlusOutlined, DeleteOutlined, MessageOutlined } from '@ant-design/icons';
import { Button, List, Typography, Popconfirm, Empty, Spin } from 'antd';
import Image from 'next/image';
import {
  useConversations,
  useDeleteConversation,
  type Conversation,
} from '../lib/chat-api';

const { Text } = Typography;

interface ConversationSidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationSidebarProps) {
  const { data: conversations = [], isLoading } = useConversations();
  const deleteMutation = useDeleteConversation();

  const handleDelete = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate(conversationId);
  };

  const groupByDate = (convs: Conversation[]) => {
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const thisWeek: Conversation[] = [];
    const older: Conversation[] = [];

    convs.forEach((conv) => {
      const diff = now - conv.timestamp;
      
      if (diff < oneDay) {
        today.push(conv);
      } else if (diff < 2 * oneDay) {
        yesterday.push(conv);
      } else if (diff < oneWeek) {
        thisWeek.push(conv);
      } else {
        older.push(conv);
      }
    });

    return [
      { title: 'Today', items: today },
      { title: 'Yesterday', items: yesterday },
      { title: 'This Week', items: thisWeek },
      { title: 'Older', items: older },
    ].filter((group) => group.items.length > 0);
  };

  const groups = groupByDate(conversations);

  return (
    <div
      style={{
        width: 280,
        height: '100vh',
        background: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '16px 24px',
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: 40 }}>
          <Image
            src="/logo.svg"
            alt="Logo"
            fill
            style={{
              objectFit: 'contain',
            }}
          />
        </div>
      </div>

      {/* New Chat Button */}
      <div
        style={{
          padding: 10,
        }}
      >
        <Button
          icon={<PlusOutlined />}
          onClick={onNewConversation}
          block
          size="middle"
          style={{
            background: '#2b3544',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 500,
            height: 40,
            minHeight: 40,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1f2937';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#2b3544';
          }}
        >
          New chat
        </Button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
        }}
      >
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <Spin />
          </div>
        ) : groups.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No conversations yet"
            style={{ marginTop: 40 }}
          />
        ) : (
          groups.map((group) => (
            <div key={group.title} style={{ marginBottom: 16 }}>
              <div
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <MessageOutlined style={{ fontSize: 16, color: '#666' }} />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#262626',
                  }}
                >
                  {group.title}
                </Text>
              </div>
              <List
                dataSource={group.items}
                renderItem={(conv) => (
                  <List.Item
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      background:
                        currentConversationId === conv.id
                          ? '#e8f0fe'
                          : 'transparent',
                      borderRadius: 8,
                      margin: '2px 8px',
                      transition: 'all 0.2s',
                      border: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (currentConversationId !== conv.id) {
                        e.currentTarget.style.background = '#f3f4f6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentConversationId !== conv.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        width: '100%',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        
                        <Text
                          ellipsis
                          style={{
                            fontSize: 14,
                            color: '#262626',
                            display: 'block',
                            fontWeight: currentConversationId === conv.id ? 500 : 400,
                          }}
                        >
                          {conv.title}
                        </Text>
                      </div>
                      <Popconfirm
                        title="Delete conversation?"
                        onConfirm={(e) => handleDelete(conv.id, e as React.MouseEvent)}
                        okText="Delete"
                        cancelText="Cancel"
                      >
                        <DeleteOutlined
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: 14,
                            color: '#999',
                            marginTop: 4,
                            marginLeft: 8,
                            opacity: 0.6,
                          }}
                        />
                      </Popconfirm>
                    </div>
                  </List.Item>
                )}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

