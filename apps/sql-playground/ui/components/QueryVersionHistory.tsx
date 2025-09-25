import { useQuery } from '@tanstack/react-query';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTabContext } from '../contexts/TabContext';
import backend from '~backend/client';
import type { QueryVersion } from '~backend/history/types';
import { Tab } from '../types/tab';

interface QueryVersionHistoryProps {
  tab: Tab;
}

export function QueryVersionHistory({ tab }: QueryVersionHistoryProps) {
  const { updateTab } = useTabContext();

  const { data: versionsData } = useQuery({
    queryKey: ['queryVersions', tab.queryId],
    queryFn: () => {
      if (!tab.queryId) return null;
      return backend.history.getVersions({ queryId: tab.queryId });
    },
    enabled: !!tab.queryId,
  });

  const handleVersionClick = (version: QueryVersion) => {
    const shortQueryId = tab.queryId?.slice(0, 8) || 'Unknown';
    updateTab(tab.id, {
      query: version.queryText,
      currentVersionNumber: version.versionNumber,
      title: `Query ${shortQueryId} @ v${version.versionNumber}`,
      // Clear results when switching versions
      result: null,
      error: null,
      isLoading: false,
    });
  };

  // Don't show if no queryId or no versions
  if (!tab.queryId || !versionsData?.versions?.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 p-2 border-l bg-muted/10 min-w-[40px]">
      <div className="text-xs font-medium text-muted-foreground mb-2 text-center">
        Versions
      </div>
      
      <TooltipProvider>
        <div className="flex flex-col gap-2">
          {versionsData.versions.map((version) => {
            const isActive = version.versionNumber === tab.currentVersionNumber;
            
            return (
              <Tooltip key={version.id}>
                <TooltipTrigger asChild>
                  <button
                    className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center text-xs font-bold ${
                      version.status === 'success'
                        ? isActive
                          ? 'bg-green-500 border-green-600 text-white shadow-lg'
                          : 'bg-green-500 border-green-600 text-white'
                        : isActive
                          ? 'bg-red-500 border-red-600 text-white shadow-lg'
                          : 'bg-red-500 border-red-600 text-white'
                    } ${isActive ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                    onClick={() => handleVersionClick(version)}
                  >
                    {version.versionNumber}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-sm">
                  <div className="space-y-2">
                    <div className="font-medium">
                      Version {version.versionNumber} - {version.status}
                      {isActive && <span className="text-primary"> (current)</span>}
                    </div>
                    <div className="text-xs">
                      {new Date(version.executedAt).toLocaleString()}
                    </div>
                    <code className="text-xs block bg-muted p-2 rounded max-h-32 overflow-auto">
                      {version.queryText.length > 200
                        ? `${version.queryText.substring(0, 200)}...`
                        : version.queryText}
                    </code>
                    {version.status === 'success' ? (
                      <div className="text-xs text-green-600">
                        {version.rowCount} rows in {version.executionTimeMs}ms
                      </div>
                    ) : (
                      <div className="text-xs text-red-600 max-w-xs break-words">
                        {version.errorMessage}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}