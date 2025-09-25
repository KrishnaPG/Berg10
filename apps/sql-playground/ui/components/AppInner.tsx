import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MainArea } from './MainArea';
import { TabProvider } from '../contexts/TabContext';
import { QueryExecutionProvider } from '../contexts/QueryExecutionContext';

export function AppInner() {
  const [sidebarWidth, setSidebarWidth] = useState(300);

  return (
    <TabProvider>
      <QueryExecutionProvider>
        <div className="flex h-full">
          <Sidebar width={sidebarWidth} onResize={setSidebarWidth} />
          <MainArea />
        </div>
      </QueryExecutionProvider>
    </TabProvider>
  );
}
