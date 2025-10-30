'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import { useState, type ReactNode } from 'react';

const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
};

const antdTheme = {
  token: {
    colorPrimary: '#1677ff',
    colorBgLayout: '#f5f5f5',
    colorText: '#262626',
    borderRadius: 12,
    fontSize: 14,
  },
  components: {
    Layout: {
      siderBg: '#ffffff',
      headerBg: '#ffffff',
    },
  },
};

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient(queryClientConfig));

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antdTheme} locale={enUS}>
        <App>
          {children}
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

