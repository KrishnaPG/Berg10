import { useState, useEffect, useMemo } from 'react';
import { Clock, Zap, Database, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tab } from '../types/tab';

interface QueryPerformanceProps {
  tab: Tab;
}

interface PerformanceMetrics {
  executionTime: number;
  rowsScanned: number;
  rowsReturned: number;
  indexesUsed: string[];
  executionPlan: ExecutionStep[];
  recommendations: Recommendation[];
  queryComplexity: 'Low' | 'Medium' | 'High';
  memoryUsage?: number;
}

interface ExecutionStep {
  step: string;
  operation: string;
  table?: string;
  cost: number;
  rows: number;
  timeMs: number;
}

interface Recommendation {
  type: 'index' | 'optimization' | 'warning';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  suggestion?: string;
}

export function QueryPerformance({ tab }: QueryPerformanceProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics | null>(null);

  // Mock performance analysis - in real implementation, this would call a backend API
  const analyzePerformance = async (): Promise<PerformanceMetrics> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const { result } = tab;
    if (!result) throw new Error('No query result available');

    // Generate mock performance data based on actual query results
    const executionTime = result.executionTimeMs;
    const rowsReturned = result.rowCount;
    const isSlowQuery = executionTime > 1000;
    const isLargeResultSet = rowsReturned > 1000;

    const mockData: PerformanceMetrics = {
      executionTime,
      rowsScanned: Math.max(rowsReturned, Math.floor(rowsReturned * (1 + Math.random() * 2))),
      rowsReturned,
      indexesUsed: executionTime < 100 ? ['idx_primary', 'idx_created_at'] : ['idx_primary'],
      queryComplexity: executionTime < 50 ? 'Low' : executionTime < 500 ? 'Medium' : 'High',
      memoryUsage: Math.floor(Math.random() * 10 + 2), // MB
      executionPlan: [
        {
          step: '1',
          operation: 'Table Scan',
          table: 'main_table',
          cost: Math.floor(executionTime * 0.7),
          rows: Math.floor(rowsReturned * 1.2),
          timeMs: Math.floor(executionTime * 0.7)
        },
        {
          step: '2',
          operation: 'Index Lookup',
          table: 'main_table',
          cost: Math.floor(executionTime * 0.2),
          rows: rowsReturned,
          timeMs: Math.floor(executionTime * 0.2)
        },
        {
          step: '3',
          operation: 'Sort',
          cost: Math.floor(executionTime * 0.1),
          rows: rowsReturned,
          timeMs: Math.floor(executionTime * 0.1)
        }
      ],
      recommendations: [
        ...(isSlowQuery ? [{
          type: 'optimization' as const,
          severity: 'warning' as const,
          title: 'Slow Query Detected',
          description: `Query took ${executionTime}ms to execute, which is above the recommended threshold.`,
          suggestion: 'Consider adding indexes on frequently queried columns or optimizing WHERE clauses.'
        }] : []),
        ...(isLargeResultSet ? [{
          type: 'warning' as const,
          severity: 'info' as const,
          title: 'Large Result Set',
          description: `Query returned ${rowsReturned} rows. Large result sets can impact performance.`,
          suggestion: 'Consider adding LIMIT clauses or more specific WHERE conditions to reduce result size.'
        }] : []),
        ...(executionTime < 100 ? [{
          type: 'optimization' as const,
          severity: 'info' as const,
          title: 'Well Optimized',
          description: 'This query is performing well with good execution time.',
        }] : []),
        {
          type: 'index' as const,
          severity: 'info' as const,
          title: 'Index Usage',
          description: executionTime < 100 
            ? 'Query is effectively using available indexes.' 
            : 'Consider adding indexes on columns used in WHERE, JOIN, and ORDER BY clauses.',
          suggestion: executionTime >= 100 ? 'CREATE INDEX idx_column_name ON table_name (column_name);' : undefined
        }
      ]
    };

    return mockData;
  };

  useEffect(() => {
    if (tab.result && !tab.isLoading && !tab.error) {
      setIsLoading(true);
      analyzePerformance()
        .then(setPerformanceData)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setPerformanceData(null);
    }
  }, [tab.result, tab.isLoading, tab.error, tab.query]);

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Low': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'High': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'index': return Database;
      case 'optimization': return Zap;
      case 'warning': return AlertTriangle;
      default: return Info;
    }
  };

  const getRecommendationVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'default';
    }
  };

  if (tab.isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Executing query...</p>
        </div>
      </div>
    );
  }

  if (tab.error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Badge variant="destructive" className="mb-2">Error</Badge>
          <p className="text-sm text-muted-foreground">Cannot analyze performance due to query error.</p>
        </div>
      </div>
    );
  }

  if (!tab.result) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Run a query to see performance analysis here
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Analyzing query performance...</p>
        </div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Failed to analyze query performance
        </p>
      </div>
    );
  }

  const scanEfficiency = ((performanceData.rowsReturned / performanceData.rowsScanned) * 100);

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Execution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.executionTime}ms</div>
            <p className="text-xs text-muted-foreground">
              {performanceData.executionTime < 100 ? 'Excellent' : 
               performanceData.executionTime < 500 ? 'Good' : 
               performanceData.executionTime < 1000 ? 'Fair' : 'Slow'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scan Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scanEfficiency.toFixed(1)}%</div>
            <Progress value={scanEfficiency} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {performanceData.rowsReturned} / {performanceData.rowsScanned} rows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Query Complexity</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getComplexityColor(performanceData.queryComplexity)}`}>
              {performanceData.queryComplexity}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on execution plan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.memoryUsage}MB</div>
            <p className="text-xs text-muted-foreground">
              Peak memory consumption
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Execution Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Plan</CardTitle>
          <CardDescription>Step-by-step breakdown of query execution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {performanceData.executionPlan.map((step, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{step.step}</Badge>
                  <div>
                    <p className="font-medium">{step.operation}</p>
                    {step.table && (
                      <p className="text-sm text-muted-foreground">Table: {step.table}</p>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{step.timeMs}ms</p>
                  <p className="text-muted-foreground">{step.rows.toLocaleString()} rows</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Index Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Index Usage</CardTitle>
          <CardDescription>Indexes utilized during query execution</CardDescription>
        </CardHeader>
        <CardContent>
          {performanceData.indexesUsed.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {performanceData.indexesUsed.map((index, idx) => (
                <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {index}
                </Badge>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No indexes were used for this query. Consider adding appropriate indexes for better performance.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Recommendations</CardTitle>
          <CardDescription>Suggestions to improve query performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {performanceData.recommendations.map((rec, index) => {
            const Icon = getRecommendationIcon(rec.type);
            return (
              <Alert key={index} variant={getRecommendationVariant(rec.severity) as any}>
                <Icon className="h-4 w-4" />
                <div>
                  <p className="font-medium">{rec.title}</p>
                  <AlertDescription className="mt-1">
                    {rec.description}
                    {rec.suggestion && (
                      <div className="mt-2 p-2 bg-muted/50 rounded font-mono text-sm">
                        {rec.suggestion}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}