import { AlertCircle, RefreshCw, Lightbulb, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ErrorDisplayProps {
  error: string;
  category?: 'syntax' | 'runtime' | 'permission' | 'connection' | 'timeout' | 'unknown';
  suggestions?: string[];
  isRetryable?: boolean;
  attemptCount?: number;
  onRetry?: () => void;
  executionTimeMs?: number;
  className?: string;
}

export function ErrorDisplay({
  error,
  category = 'unknown',
  suggestions = [],
  isRetryable = false,
  attemptCount = 1,
  onRetry,
  executionTimeMs,
  className = ""
}: ErrorDisplayProps) {
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'syntax': return 'bg-blue-500';
      case 'runtime': return 'bg-orange-500';
      case 'permission': return 'bg-purple-500';
      case 'connection': return 'bg-red-500';
      case 'timeout': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'syntax': return '{ }';
      case 'runtime': return '⚠️';
      case 'permission': return '🔒';
      case 'connection': return '🔌';
      case 'timeout': return '⏱️';
      default: return '❌';
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className={`h-full flex items-center justify-center p-4 ${className}`}>
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg">Query Failed</CardTitle>
            </div>
            <Badge 
              variant="outline" 
              className={`text-white border-none ${getCategoryColor(category)}`}
            >
              {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)} Error
            </Badge>
          </div>
          <CardDescription className="text-base font-medium text-foreground">
            {error}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Execution Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {executionTimeMs !== undefined && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Failed after {formatTime(executionTimeMs)}</span>
              </div>
            )}
            {attemptCount > 1 && (
              <Badge variant="outline" className="text-xs">
                Attempt {attemptCount}
              </Badge>
            )}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <h4 className="font-medium">Suggestions to fix this issue:</h4>
                </div>
                <ul className="space-y-2 text-sm">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <span className="text-muted-foreground">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Retry Button */}
          {isRetryable && onRetry && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  This error might be temporary and could be resolved by retrying.
                </p>
                <Button 
                  onClick={onRetry}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-3 w-3" />
                  Try Again
                </Button>
              </div>
            </>
          )}

          {/* Category-specific help */}
          {category === 'syntax' && (
            <>
              <Separator />
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
                <p className="text-sm">
                  <strong>Syntax errors</strong> occur when your SQL doesn't follow the correct format. 
                  Double-check your SQL syntax, especially around quotes, commas, and parentheses.
                </p>
              </div>
            </>
          )}

          {category === 'timeout' && (
            <>
              <Separator />
              <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-md">
                <p className="text-sm">
                  <strong>Timeout errors</strong> happen when queries take too long to execute. 
                  Try adding WHERE clauses to limit the data or breaking complex queries into smaller parts.
                </p>
              </div>
            </>
          )}

          {category === 'connection' && (
            <>
              <Separator />
              <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
                <p className="text-sm">
                  <strong>Connection errors</strong> are usually temporary network issues. 
                  Wait a moment and try running your query again.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}