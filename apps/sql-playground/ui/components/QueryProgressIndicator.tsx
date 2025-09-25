import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface QueryProgressIndicatorProps {
  isExecuting: boolean;
  startTime?: Date;
  error?: string | null;
  completed?: boolean;
  attemptCount?: number;
  maxRetries?: number;
}

export function QueryProgressIndicator({ 
  isExecuting, 
  startTime, 
  error, 
  completed = false,
  attemptCount = 1,
  maxRetries = 3
}: QueryProgressIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progressValue, setProgressValue] = useState(0);

  useEffect(() => {
    if (!isExecuting || !startTime) {
      setElapsedTime(0);
      setProgressValue(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
      
      // Progressive loading animation - gets slower as time goes on
      if (elapsed < 5) {
        setProgressValue(elapsed * 20); // 0-100% in first 5 seconds
      } else if (elapsed < 15) {
        setProgressValue(80 + (elapsed - 5) * 1.5); // 80-95% in next 10 seconds
      } else {
        setProgressValue(95 + Math.min((elapsed - 15) * 0.1, 4)); // 95-99% after 15 seconds
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isExecuting, startTime]);

  if (!isExecuting && !error && !completed) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = () => {
    if (error) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (completed) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (isExecuting) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (error) {
      return attemptCount > 1 ? `Failed after ${attemptCount} attempts` : 'Query failed';
    }
    if (completed) {
      return `Completed in ${formatTime(elapsedTime)}`;
    }
    if (isExecuting) {
      const baseText = attemptCount > 1 
        ? `Retrying (${attemptCount}/${maxRetries})` 
        : 'Executing query';
      return elapsedTime > 0 ? `${baseText} - ${formatTime(elapsedTime)}` : baseText;
    }
    return 'Ready';
  };

  const getProgressColor = () => {
    if (error) return 'bg-destructive';
    if (completed) return 'bg-green-500';
    if (elapsedTime > 30) return 'bg-orange-500';
    if (elapsedTime > 15) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-md border">
      {getStatusIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate">
            {getStatusText()}
          </span>
          {isExecuting && elapsedTime > 10 && (
            <span className="text-xs text-muted-foreground">
              {elapsedTime > 30 ? 'This is taking longer than usual...' : 'Processing...'}
            </span>
          )}
        </div>
        {isExecuting && (
          <Progress 
            value={progressValue} 
            className="h-1.5"
            style={{
              background: 'var(--muted)',
            }}
          >
            <div 
              className={`h-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${progressValue}%` }}
            />
          </Progress>
        )}
      </div>
    </div>
  );
}