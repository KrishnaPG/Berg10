import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tab } from '../types/tab';
import { QueryResults } from './QueryResults';
import { QueryPerformance } from './QueryPerformance';

interface BottomPanelProps {
  tab: Tab;
}

export function BottomPanel({ tab }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState('results');

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 bg-muted/30 border-b rounded-none h-auto p-0">
          <TabsTrigger 
            value="results" 
            className="rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Results
          </TabsTrigger>
          <TabsTrigger 
            value="performance" 
            className="rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Performance
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="results" className="flex-1 m-0">
          <QueryResults tab={tab} />
        </TabsContent>
        
        <TabsContent value="performance" className="flex-1 m-0">
          <QueryPerformance tab={tab} />
        </TabsContent>
      </Tabs>
    </div>
  );
}