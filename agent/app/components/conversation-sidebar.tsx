'use client';

import { useState, useEffect } from 'react';
import { PlusOutlined, DeleteOutlined, MessageOutlined } from '@ant-design/icons';
import { Button, List, Typography, Popconfirm, Empty } from 'antd';
import {
  getConversations,
  deleteConversation,
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
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    loadConversations();
    
    // Listen for storage changes from other tabs/windows
    const handleStorage = () => {
      loadConversations();
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const loadConversations = () => {
    const loaded = getConversations();
    setConversations(loaded);
  };

  const handleDelete = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation(conversationId);
    loadConversations();
  };

  const groupByDate = (convs: Conversation[]) => {
    const now = Date.now();
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
        background: 'white',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: 16,
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onNewConversation}
          block
          size="large"
        >
          New Chat
        </Button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
        }}
      >
        {groups.length === 0 ? (
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
                  padding: '8px 16px',
                  color: '#999',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {group.title}
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
                          ? '#f0f7ff'
                          : 'transparent',
                      borderLeft:
                        currentConversationId === conv.id
                          ? '3px solid #1677ff'
                          : '3px solid transparent',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (currentConversationId !== conv.id) {
                        e.currentTarget.style.background = '#f9fafb';
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
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <MessageOutlined
                            style={{ fontSize: 14, color: '#1677ff' }}
                          />
                          <Text
                            ellipsis
                            strong
                            style={{
                              fontSize: 14,
                              color:
                                currentConversationId === conv.id
                                  ? '#1677ff'
                                  : '#262626',
                            }}
                          >
                            {conv.title}
                          </Text>
                        </div>
                        {conv.lastMessage && (
                          <Text
                            ellipsis
                            type="secondary"
                            style={{ fontSize: 12 }}
                          >
                            {conv.lastMessage}
                          </Text>
                        )}
                      </div>
                      <Popconfirm
                        title="Delete conversation?"
                        onConfirm={(e) => handleDelete(conv.id, e as any)}
                        okText="Delete"
                        cancelText="Cancel"
                      >
                        <DeleteOutlined
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: 14,
                            color: '#999',
                            marginLeft: 8,
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

