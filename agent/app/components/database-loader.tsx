'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Progress, Alert, Spin } from 'antd';
import { DatabaseOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { DatabaseStatus, onDatabaseStatusChange, getBrowserDatabase } from '../lib/browser-db';

// Context for database status
interface DatabaseContextValue {
  status: DatabaseStatus;
  database: ReturnType<typeof getBrowserDatabase> | null;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

/**
 * Hook to access database context
 */
export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within DatabaseLoader');
  }
  return context;
}

interface DatabaseLoaderProps {
  children: ReactNode;
}

/**
 * DatabaseLoader component
 * Initializes the browser database and shows loading progress
 */
export function DatabaseLoader({ children }: DatabaseLoaderProps) {
  const [status, setStatus] = useState<DatabaseStatus>({
    status: 'loading',
    progress: 0,
  });
  const [database] = useState(() => getBrowserDatabase());

  useEffect(() => {
    // Subscribe to database status updates
    const unsubscribe = onDatabaseStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Show loading UI until database is ready
  if (status.status === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'white',
          padding: '40px',
        }}
      >
        <div style={{ maxWidth: 600, width: '100%', textAlign: 'center' }}>
          <div style={{ marginBottom: 32 }}>
            <DatabaseOutlined style={{ fontSize: 64, color: '#1677ff' }} />
          </div>
          
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>
            {status.cachedVersion ? 'Loading Database...' : 'Initializing Database...'}
          </h1>
          
          <p style={{ fontSize: 14, color: '#666', marginBottom: 32 }}>
            {status.progress < 10 && 'Setting up database engine...'}
            {status.progress >= 10 && status.progress < 15 && 'Checking for cached data...'}
            {status.progress >= 15 && status.progress < 90 && !status.cachedVersion && 'Downloading database (70 MB)... This is a one-time download.'}
            {status.progress >= 90 && status.cachedVersion && 'Loading from cache...'}
            {status.progress >= 90 && !status.cachedVersion && 'Initializing database...'}
          </p>

          <Progress
            percent={status.progress}
            status="active"
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />

          {status.cachedVersion && status.progress < 100 && (
            <div style={{ marginTop: 16 }}>
              <Alert
                message="Using cached database"
                description="Loading from your browser's local cache for instant access."
                type="success"
                showIcon
                style={{ textAlign: 'left' }}
              />
            </div>
          )}

          {!status.cachedVersion && status.progress > 15 && status.progress < 90 && (
            <div style={{ marginTop: 16 }}>
              <Alert
                message="First-time setup"
                description="Downloading and caching database. Subsequent visits will be instant!"
                type="info"
                showIcon
                style={{ textAlign: 'left' }}
              />
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Spin size="small" />
            <span style={{ fontSize: 12, color: '#999' }}>
              Please wait while we prepare your local database...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Show error UI if initialization failed
  if (status.status === 'error') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'white',
          padding: '40px',
        }}
      >
        <div style={{ maxWidth: 600, width: '100%', textAlign: 'center' }}>
          <div style={{ marginBottom: 32 }}>
            <CloseCircleOutlined style={{ fontSize: 64, color: '#ff4d4f' }} />
          </div>
          
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>
            Database Initialization Failed
          </h1>
          
          <Alert
            message="Error"
            description={status.error || 'An unknown error occurred while initializing the database.'}
            type="error"
            showIcon
            style={{ textAlign: 'left', marginBottom: 24 }}
          />

          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px',
                fontSize: 14,
                background: '#1677ff',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>

          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 12, color: '#999' }}>
              If the problem persists, try clearing your browser cache and reloading.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Database is ready! Show success briefly, then render children
  if (status.status === 'ready' && status.progress === 100) {
    return (
      <DatabaseContext.Provider value={{ status, database }}>
        {/* Show a brief success message that auto-dismisses */}
        <DatabaseReadyBanner />
        {children}
      </DatabaseContext.Provider>
    );
  }

  return null;
}

/**
 * Brief success banner that shows when database is ready
 */
function DatabaseReadyBanner() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Auto-hide after 2 seconds
    const timer = setTimeout(() => {
      setShow(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      <Alert
        message="Database Ready"
        description="All data loaded successfully!"
        type="success"
        icon={<CheckCircleOutlined />}
        showIcon
        closable
        onClose={() => setShow(false)}
      />
    </div>
  );
}

