import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tab } from '../types/tab';
import { useVirtualScrolling } from '../hooks/useVirtualScrolling';
import { ErrorDisplay } from './ErrorDisplay';
import { QueryProgressIndicator } from './QueryProgressIndicator';
import { useQueryExecution } from '../contexts/QueryExecutionContext';

interface QueryResultsProps {
  tab: Tab;
}

export function QueryResults({ tab }: QueryResultsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showVirtualScrolling, setShowVirtualScrolling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);

  const { result, error, isLoading, query } = tab;
  const { executeQuery, isExecuting } = useQueryExecution();

  const filteredAndSortedData = useMemo(() => {
    if (!result?.rows) return [];

    let filtered = result.rows;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        
        let comparison = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }, [result?.rows, searchTerm, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedData.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);

  // Use virtual scrolling for large datasets (>1000 rows)
  const shouldUseVirtualScrolling = filteredAndSortedData.length > 1000 || showVirtualScrolling;
  const ROW_HEIGHT = 41; // Approximate table row height

  const virtualScrolling = useVirtualScrolling({
    itemHeight: ROW_HEIGHT,
    containerHeight,
    items: filteredAndSortedData,
    overscan: 10
  });

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(Math.max(400, rect.height));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    if (!result?.rows) return;
    
    const csv = [
      result.columns.map(col => col.name).join(','),
      ...result.rows.map(row => 
        result.columns.map(col => {
          const value = row[col.name];
          return value === null ? '' : `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRetry = () => {
    if (query && tab.id) {
      executeQuery(tab.id, query);
    }
  };

  if (isLoading || isExecuting) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4">
          <QueryProgressIndicator 
            isExecuting={isLoading || isExecuting}
            startTime={tab.executionStartTime}
            error={error}
            completed={!isLoading && !isExecuting && !!result}
          />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Executing query...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    // Try to parse error if it has additional metadata
    let errorCategory, suggestions, isRetryable, attemptCount;
    try {
      // Check if error is a JSON string with metadata
      if (error.includes('{') && error.includes('}')) {
        const errorData = JSON.parse(error);
        errorCategory = errorData.category;
        suggestions = errorData.suggestions;
        isRetryable = errorData.isRetryable;
        attemptCount = errorData.attemptCount;
      }
    } catch {
      // If parsing fails, use the error as-is
    }

    return (
      <ErrorDisplay 
        error={typeof error === 'string' ? error : 'An unexpected error occurred'}
        category={errorCategory}
        suggestions={suggestions}
        isRetryable={isRetryable}
        attemptCount={attemptCount}
        onRetry={handleRetry}
        executionTimeMs={result?.executionTimeMs}
      />
    );
  }

  if (!result) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Run a query to see results here
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Results Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            {result.rowCount} rows in {result.executionTimeMs}ms
          </Badge>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <Input
              placeholder="Search results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!shouldUseVirtualScrolling && (
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Button 
            size="sm" 
            variant={shouldUseVirtualScrolling ? "default" : "outline"}
            onClick={() => setShowVirtualScrolling(!showVirtualScrolling)}
          >
            {shouldUseVirtualScrolling ? 'Virtual Scroll ON' : 'Virtual Scroll'}
          </Button>

          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Results Table */}
      <div className="flex-1 overflow-hidden" ref={containerRef}>
        {shouldUseVirtualScrolling ? (
          <div className="h-full">
            {/* Fixed Header */}
            <div className="border-b bg-background sticky top-0 z-10">
              <Table>
                <TableHeader>
                  <TableRow>
                    {result.columns.map((column) => (
                      <TableHead
                        key={column.name}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort(column.name)}
                      >
                        <div className="flex items-center gap-2">
                          <span>{column.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {column.type}
                          </Badge>
                          {sortColumn === column.name && (
                            <span className="text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
              </Table>
            </div>
            
            {/* Virtual Scrolled Content */}
            <div {...virtualScrolling.containerProps} data-virtual-scroll-container>
              <div {...virtualScrolling.scrollElementProps}>
                {virtualScrolling.virtualItems.map((virtualItem) => (
                  <div
                    key={virtualItem.index}
                    style={{
                      position: 'absolute',
                      top: virtualItem.start,
                      width: '100%',
                      height: ROW_HEIGHT,
                    }}
                  >
                    <Table>
                      <TableBody>
                        <TableRow className="h-full">
                          {result.columns.map((column) => (
                            <TableCell key={column.name}>
                              {virtualItem.item[column.name] === null ? (
                                <span className="text-muted-foreground italic">NULL</span>
                              ) : (
                                String(virtualItem.item[column.name])
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {result.columns.map((column) => (
                    <TableHead
                      key={column.name}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort(column.name)}
                    >
                      <div className="flex items-center gap-2">
                        <span>{column.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {column.type}
                        </Badge>
                        {sortColumn === column.name && (
                          <span className="text-xs">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((row, index) => (
                  <TableRow key={index}>
                    {result.columns.map((column) => (
                      <TableCell key={column.name}>
                        {row[column.name] === null ? (
                          <span className="text-muted-foreground italic">NULL</span>
                        ) : (
                          String(row[column.name])
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination or Virtual Scroll Info */}
      <div className="flex items-center justify-between p-4 border-t">
        <div className="text-sm text-muted-foreground">
          {shouldUseVirtualScrolling ? (
            <>Showing all {filteredAndSortedData.length} results (Virtual Scrolling)</>
          ) : (
            <>Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAndSortedData.length)} of {filteredAndSortedData.length} results</>
          )}
        </div>
        
        {!shouldUseVirtualScrolling && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
