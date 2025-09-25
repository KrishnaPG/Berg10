import { useQuery } from '@tanstack/react-query';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTabContext } from '../contexts/TabContext';
import backend from '~backend/client';
import type { QueryEntry, QueryVersion } from '~backend/history/types';

export function QueryHistory() {
  const { createOrFocusTab } = useTabContext();

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['queryHistory'],
    queryFn: () => backend.history.list({ limit: 50, offset: 0 }),
  });

  const handleLoadQuery = (queryEntry: QueryEntry, version?: QueryVersion) => {
    const versionToLoad = version || queryEntry.latestVersion;
    if (!versionToLoad) return;

    createOrFocusTab({
      query: versionToLoad.queryText,
      title: queryEntry.title || `Query ${queryEntry.id.slice(0, 8)} @ v${versionToLoad.versionNumber}`,
      queryId: queryEntry.id,
      currentVersionNumber: versionToLoad.versionNumber,
    });
  };

  const handleVersionClick = (queryEntry: QueryEntry, version: QueryVersion, e: React.MouseEvent) => {
    e.stopPropagation();
    handleLoadQuery(queryEntry, version);
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
        <p className="text-xs text-muted-foreground mt-2">Loading history...</p>
      </div>
    );
  }

  if (!historyData?.queries.length) {
    return (
      <div className="p-4 text-center">
        <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No query history yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-3">
        {historyData.queries.map((queryEntry) => {
          const latestVersion = queryEntry.latestVersion;
          if (!latestVersion) return null;

          return (
            <div
              key={queryEntry.id}
              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handleLoadQuery(queryEntry)}
            >
              {/* Header with status and timestamp */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {latestVersion.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <Badge variant={latestVersion.status === 'success' ? 'default' : 'destructive'}>
                    {latestVersion.status}
                  </Badge>
                  {queryEntry.versions.length > 1 && (
                    <Badge variant="outline" className="text-xs">
                      {queryEntry.versions.length} versions
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(latestVersion.executedAt).toLocaleString()}
                </span>
              </div>
              
              {/* Query preview */}
              <code className="text-xs bg-muted p-2 rounded block overflow-hidden mb-3">
                {latestVersion.queryText.length > 100
                  ? `${latestVersion.queryText.substring(0, 100)}...`
                  : latestVersion.queryText}
              </code>
              
              {/* Execution info */}
              <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                {latestVersion.status === 'success' ? (
                  <span>
                    {latestVersion.rowCount} rows in {latestVersion.executionTimeMs}ms
                  </span>
                ) : (
                  <span className="text-red-500">
                    {latestVersion.errorMessage}
                  </span>
                )}
              </div>

              {/* Version dots */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-muted-foreground mr-2">Versions:</span>
                <TooltipProvider>
                  {queryEntry.versions.map((version) => (
                    <Tooltip key={version.id}>
                      <TooltipTrigger asChild>
                        <button
                          className={`w-3 h-3 rounded-full border-2 transition-all hover:scale-125 ${
                            version.status === 'success'
                              ? 'bg-green-500 border-green-600'
                              : 'bg-red-500 border-red-600'
                          }`}
                          onClick={(e) => handleVersionClick(queryEntry, version, e)}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="space-y-1">
                          <div className="font-medium">
                            Version {version.versionNumber} - {version.status}
                          </div>
                          <div className="text-xs">
                            {new Date(version.executedAt).toLocaleString()}
                          </div>
                          <code className="text-xs block bg-muted p-1 rounded max-h-20 overflow-hidden">
                            {version.queryText.length > 80
                              ? `${version.queryText.substring(0, 80)}...`
                              : version.queryText}
                          </code>
                          {version.status === 'success' ? (
                            <div className="text-xs text-green-600">
                              {version.rowCount} rows in {version.executionTimeMs}ms
                            </div>
                          ) : (
                            <div className="text-xs text-red-600">
                              {version.errorMessage}
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}