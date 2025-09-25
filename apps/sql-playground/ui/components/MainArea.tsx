import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QueryTab } from './QueryTab';
import { useTabContext } from '../contexts/TabContext';

export function MainArea() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabContext();

  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No queries open
          </h3>
          <p className="text-sm text-muted-foreground">
            Click "New Query" to start writing SQL
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Tabs value={activeTabId || undefined} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 h-auto p-0">
          {tabs.map((tab) => (
            <div key={tab.id} className="flex items-center group">
              <TabsTrigger
                value={tab.id}
                className="rounded-none border-r data-[state=active]:bg-background"
              >
                {tab.title}
              </TabsTrigger>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="flex-1 m-0">
            <QueryTab tab={tab} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
