import { createContext, useContext, useCallback, ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTabContext } from './TabContext';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

interface QueryExecutionContextType {
  executeQuery: (tabId: string, query: string) => Promise<void>;
  isExecuting: boolean;
}

const QueryExecutionContext = createContext<QueryExecutionContextType | null>(null);

interface QueryExecutionProviderProps {
  children: ReactNode;
}

export function QueryExecutionProvider({ children }: QueryExecutionProviderProps) {
  const { updateTab, getTab } = useTabContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ query }: { query: string; tabId: string }) => {
      return await backend.sql_engine.execute({ query });
    },
    onSuccess: async (result, variables) => {
      const { query, tabId } = variables as { query: string; tabId: string };
      const tab = getTab(tabId);
      
      updateTab(tabId, {
        result,
        error: null,
        isLoading: false,
        lastExecuted: new Date(),
      });

      try {
        // Save to history - this will create a new query entry if no queryId exists
        const saveResponse = await backend.history.save({
          queryId: tab?.queryId, // undefined for new queries
          queryText: query,
          executionTimeMs: result.executionTimeMs,
          rowCount: result.rowCount,
          status: 'success',
        });

        // Update tab with queryId, version info, and title
        const shortQueryId = saveResponse.queryId.slice(0, 8);
        updateTab(tabId, {
          queryId: saveResponse.queryId,
          currentVersionNumber: saveResponse.versionNumber,
          title: `Query ${shortQueryId} @ v${saveResponse.versionNumber}`,
        });

        // Invalidate history cache
        queryClient.invalidateQueries({ queryKey: ['queryHistory'] });
        queryClient.invalidateQueries({ queryKey: ['queryVersions', saveResponse.queryId] });
      } catch (error) {
        console.error('Failed to save query to history:', error);
      }
    },
    onError: async (error: any, variables) => {
      const { query, tabId } = variables as { query: string; tabId: string };
      const tab = getTab(tabId);
      
      let errorMessage = error?.message || 'Query execution failed';
      let parsedError = null;
      
      // Try to parse enhanced error information
      try {
        if (errorMessage.startsWith('{') && errorMessage.endsWith('}')) {
          parsedError = JSON.parse(errorMessage);
          errorMessage = parsedError.message || errorMessage;
        }
      } catch {
        // If parsing fails, use the original error message
      }
      
      updateTab(tabId, {
        error: parsedError ? JSON.stringify(parsedError) : errorMessage,
        result: null,
        isLoading: false,
      });

      try {
        // Save error to history
        const saveResponse = await backend.history.save({
          queryId: tab?.queryId, // undefined for new queries
          queryText: query,
          status: 'error',
          errorMessage: parsedError ? parsedError.message : errorMessage,
        });

        // Update tab with queryId, version info, and title
        const shortQueryId = saveResponse.queryId.slice(0, 8);
        updateTab(tabId, {
          queryId: saveResponse.queryId,
          currentVersionNumber: saveResponse.versionNumber,
          title: `Query ${shortQueryId} @ v${saveResponse.versionNumber}`,
        });

        // Invalidate history cache
        queryClient.invalidateQueries({ queryKey: ['queryHistory'] });
        queryClient.invalidateQueries({ queryKey: ['queryVersions', saveResponse.queryId] });
      } catch (saveError) {
        console.error('Failed to save query error to history:', saveError);
      }

      toast({
        title: 'Query Error',
        description: parsedError ? parsedError.message : errorMessage,
        variant: 'destructive',
      });

      console.error('Query execution error:', error);
    },
  });

  const executeQuery = useCallback(async (tabId: string, query: string) => {
    const startTime = new Date();
    updateTab(tabId, {
      isLoading: true,
      error: null,
      executionStartTime: startTime,
    });

    mutation.mutate({ query, tabId });
  }, [mutation, updateTab]);

  const value: QueryExecutionContextType = {
    executeQuery,
    isExecuting: mutation.isPending,
  };

  return (
    <QueryExecutionContext.Provider value={value}>
      {children}
    </QueryExecutionContext.Provider>
  );
}

export function useQueryExecution() {
  const context = useContext(QueryExecutionContext);
  if (!context) {
    throw new Error('useQueryExecution must be used within a QueryExecutionProvider');
  }
  return context;
}