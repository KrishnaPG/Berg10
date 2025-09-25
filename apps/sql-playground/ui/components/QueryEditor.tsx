import { useState, useCallback, useEffect } from 'react';
import { Play, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTabContext } from '../contexts/TabContext';
import { useQueryExecution } from '../contexts/QueryExecutionContext';
import { Tab } from '../types/tab';
import { MonacoSQLEditor } from './MonacoSQLEditor';
import { QueryProgressIndicator } from './QueryProgressIndicator';

interface QueryEditorProps {
  tab: Tab;
}

export function QueryEditor({ tab }: QueryEditorProps) {
  const { updateTab } = useTabContext();
  const { executeQuery, isExecuting } = useQueryExecution();
  const [localQuery, setLocalQuery] = useState(tab.query);

  // Sync local query state when tab.query changes (e.g., when loading a version)
  useEffect(() => {
    setLocalQuery(tab.query);
  }, [tab.query]);

  const handleQueryChange = useCallback((value: string) => {
    setLocalQuery(value);
    updateTab(tab.id, { query: value });
  }, [tab.id, updateTab]);

  const handleExecute = useCallback(async () => {
    if (!localQuery.trim()) return;
    
    await executeQuery(tab.id, localQuery);
  }, [tab.id, localQuery, executeQuery]);

  return (
    <div className="h-full flex flex-col border-b">
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleExecute}
            disabled={isExecuting || !localQuery.trim()}
          >
            <Play className="w-4 h-4 mr-2" />
            {isExecuting ? 'Executing...' : 'Run Query'}
          </Button>
          <span className="text-xs text-muted-foreground">
            Ctrl+Enter to execute
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {tab.lastExecuted && (
            <span className="text-xs text-muted-foreground">
              Last executed: {tab.lastExecuted.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Progress indicator when executing */}
      {(isExecuting || tab.isLoading) && (
        <div className="p-2 border-b">
          <QueryProgressIndicator 
            isExecuting={isExecuting || tab.isLoading}
            startTime={tab.executionStartTime}
            error={tab.error}
            completed={!isExecuting && !tab.isLoading && !!tab.result}
          />
        </div>
      )}

      <div className="flex-1 p-2 h-full">
        <MonacoSQLEditor
          value={localQuery}
          onChange={handleQueryChange}
          onExecute={handleExecute}
          placeholder="Enter your SQL query here..."
          height="100%"
        />
      </div>
    </div>
  );
}
