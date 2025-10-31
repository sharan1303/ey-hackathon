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
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isMobile = false,
  isOpen = false,
  onClose,
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

  // Mobile: full width when open, hidden when closed
  // Desktop: always visible at 280px
  const sidebarWidth = isMobile ? '100vw' : '280px';
  const sidebarTransform = isMobile ? (isOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)';
  const sidebarPosition = isMobile ? 'fixed' : 'relative';

  return (
    <div
      style={{
        width: sidebarWidth,
        height: '100vh',
        background: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        position: sidebarPosition,
        top: 0,
        left: 0,
        zIndex: isMobile ? 900 : 1,
        transform: sidebarTransform,
        transition: 'transform 0.3s ease',
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
          justifyContent: isMobile ? 'space-between' : 'center',
        }}
      >
        <div style={{ position: 'relative', width: isMobile ? '120px' : '100%', height: 40 }}>
          <Image
            src="/logo.svg"
            alt="Logo"
            fill
            style={{
              objectFit: 'contain',
            }}
          />
        </div>
        
        {/* Close button for mobile */}
        {isMobile && (
          <button
            onClick={onClose}
            aria-label="Close sidebar"
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
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5';
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

