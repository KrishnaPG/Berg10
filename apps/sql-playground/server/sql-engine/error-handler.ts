export interface SQLErrorInfo {
  category: 'syntax' | 'runtime' | 'permission' | 'connection' | 'timeout' | 'unknown';
  userFriendlyMessage: string;
  suggestions: string[];
  isRetryable: boolean;
  retryDelay?: number; // in milliseconds
}

export class SQLErrorHandler {
  private static readonly ERROR_PATTERNS = [
    // Syntax Errors
    {
      pattern: /syntax error at or near "([^"]+)"/i,
      category: 'syntax' as const,
      getMessage: (match: RegExpMatchArray) => `Syntax error near "${match[1]}"`,
      suggestions: [
        'Check for missing commas, parentheses, or quotes',
        'Verify that all keywords are spelled correctly',
        'Ensure proper SQL syntax structure'
      ],
      isRetryable: false
    },
    {
      pattern: /column "([^"]+)" does not exist/i,
      category: 'syntax' as const,
      getMessage: (match: RegExpMatchArray) => `Column "${match[1]}" doesn't exist`,
      suggestions: [
        'Check the column name spelling',
        'Verify the column exists in the selected table',
        'Use the schema explorer to see available columns'
      ],
      isRetryable: false
    },
    {
      pattern: /relation "([^"]+)" does not exist/i,
      category: 'syntax' as const,
      getMessage: (match: RegExpMatchArray) => `Table "${match[1]}" doesn't exist`,
      suggestions: [
        'Check the table name spelling',
        'Verify the table exists in the database',
        'Use the schema explorer to see available tables'
      ],
      isRetryable: false
    },
    {
      pattern: /function "([^"]+)" does not exist/i,
      category: 'syntax' as const,
      getMessage: (match: RegExpMatchArray) => `Function "${match[1]}" doesn't exist`,
      suggestions: [
        'Check the function name spelling',
        'Verify the function is available in this database',
        'Consider using a different function or creating it first'
      ],
      isRetryable: false
    },
    {
      pattern: /division by zero/i,
      category: 'runtime' as const,
      getMessage: () => 'Division by zero error',
      suggestions: [
        'Add a condition to check for zero before division',
        'Use NULLIF or CASE statements to handle zero values',
        'Example: column1 / NULLIF(column2, 0)'
      ],
      isRetryable: false
    },
    {
      pattern: /invalid input syntax for type (\w+): "([^"]+)"/i,
      category: 'syntax' as const,
      getMessage: (match: RegExpMatchArray) => `Invalid ${match[1]} value: "${match[2]}"`,
      suggestions: [
        'Ensure the value matches the expected data type format',
        'Check for proper data type conversion',
        'Use appropriate casting functions if needed'
      ],
      isRetryable: false
    },
    {
      pattern: /permission denied for table (\w+)/i,
      category: 'permission' as const,
      getMessage: (match: RegExpMatchArray) => `No permission to access table "${match[1]}"`,
      suggestions: [
        'Contact your database administrator for access',
        'Check if you have the required permissions',
        'Try accessing a different table you have access to'
      ],
      isRetryable: false
    },
    {
      pattern: /connection.*refused|connection.*timeout|server closed the connection/i,
      category: 'connection' as const,
      getMessage: () => 'Database connection failed',
      suggestions: [
        'Check your network connection',
        'Verify the database server is running',
        'Try running the query again in a moment'
      ],
      isRetryable: true,
      retryDelay: 2000
    },
    {
      pattern: /timeout|query.*cancelled/i,
      category: 'timeout' as const,
      getMessage: () => 'Query execution timed out',
      suggestions: [
        'Try simplifying your query',
        'Add WHERE clauses to limit the data processed',
        'Consider breaking complex queries into smaller parts',
        'Add appropriate indexes to improve performance'
      ],
      isRetryable: true,
      retryDelay: 1000
    },
    {
      pattern: /deadlock detected/i,
      category: 'runtime' as const,
      getMessage: () => 'Database deadlock detected',
      suggestions: [
        'Try running the query again',
        'Consider reordering operations to avoid deadlocks',
        'Use shorter transactions when possible'
      ],
      isRetryable: true,
      retryDelay: 1500
    },
    {
      pattern: /out of memory|insufficient memory/i,
      category: 'runtime' as const,
      getMessage: () => 'Query requires too much memory',
      suggestions: [
        'Add LIMIT clauses to reduce result size',
        'Use WHERE conditions to filter data earlier',
        'Break the query into smaller chunks',
        'Consider using streaming or pagination'
      ],
      isRetryable: false
    }
  ];

  static parseError(error: string): SQLErrorInfo {
    const lowerError = error.toLowerCase();
    
    // Try to match against known patterns
    for (const pattern of this.ERROR_PATTERNS) {
      const match = error.match(pattern.pattern);
      if (match) {
        return {
          category: pattern.category,
          userFriendlyMessage: pattern.getMessage(match),
          suggestions: pattern.suggestions,
          isRetryable: pattern.isRetryable,
          retryDelay: pattern.retryDelay
        };
      }
    }

    // Generic error handling for unknown errors
    if (lowerError.includes('syntax')) {
      return {
        category: 'syntax',
        userFriendlyMessage: 'SQL syntax error detected',
        suggestions: [
          'Check your SQL syntax for errors',
          'Verify all keywords are spelled correctly',
          'Ensure proper use of quotes and parentheses'
        ],
        isRetryable: false
      };
    }

    if (lowerError.includes('timeout') || lowerError.includes('cancelled')) {
      return {
        category: 'timeout',
        userFriendlyMessage: 'Query execution was cancelled or timed out',
        suggestions: [
          'Try simplifying your query',
          'Add WHERE clauses to limit data',
          'Consider breaking the query into smaller parts'
        ],
        isRetryable: true,
        retryDelay: 2000
      };
    }

    if (lowerError.includes('connection') || lowerError.includes('network')) {
      return {
        category: 'connection',
        userFriendlyMessage: 'Database connection issue',
        suggestions: [
          'Check your network connection',
          'Try running the query again',
          'Contact support if the issue persists'
        ],
        isRetryable: true,
        retryDelay: 3000
      };
    }

    // Fallback for unknown errors
    return {
      category: 'unknown',
      userFriendlyMessage: error || 'An unexpected error occurred',
      suggestions: [
        'Try running the query again',
        'Check your SQL syntax',
        'Contact support if the issue persists'
      ],
      isRetryable: true,
      retryDelay: 2000
    };
  }

  static shouldRetry(error: string, attemptCount: number, maxRetries: number = 3): boolean {
    if (attemptCount >= maxRetries) {
      return false;
    }

    const errorInfo = this.parseError(error);
    return errorInfo.isRetryable;
  }

  static getRetryDelay(error: string): number {
    const errorInfo = this.parseError(error);
    return errorInfo.retryDelay || 2000;
  }
}