import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as monaco from 'monaco-editor';
import backend from '~backend/client';

interface MonacoSQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  placeholder?: string;
  height?: string;
  theme?: 'light' | 'dark' | 'auto';
}

interface SchemaInfo {
  tables: string[];
  schema: Record<string, Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>>;
}

interface EditorInstance {
  editor: monaco.editor.IStandaloneCodeEditor;
  disposables: monaco.IDisposable[];
  completionProvider?: monaco.IDisposable;
}

export function MonacoSQLEditor({ 
  value, 
  onChange, 
  onExecute, 
  placeholder = "Enter your SQL query here...",
  height = "100%",
  theme = 'auto'
}: MonacoSQLEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<EditorInstance | null>(null);
  const [schemaState, setSchemaState] = useState<{
    data: SchemaInfo | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: true,
    error: null
  });

  // Memoized theme detection
  const currentTheme = useMemo(() => {
    if (theme === 'auto') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);

  // Memoized SQL keywords
  const sqlKeywords = useMemo(() => [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN',
    'FULL JOIN', 'CROSS JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE',
    'ALTER', 'DROP', 'INDEX', 'PRIMARY KEY', 'FOREIGN KEY', 'NOT NULL', 'UNIQUE',
    'DEFAULT', 'AUTO_INCREMENT', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
    'IS NULL', 'IS NOT NULL', 'EXISTS', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
    'DISTINCT', 'AS', 'ON', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'UNION', 'ALL',
    'EXCEPT', 'INTERSECT', 'WITH', 'RECURSIVE', 'WINDOW', 'OVER', 'PARTITION BY',
    'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LEAD', 'LAG', 'FIRST_VALUE', 'LAST_VALUE'
  ], []);

  // Load database schema with better error handling
  const loadSchema = useCallback(async () => {
    try {
      setSchemaState(prev => ({ ...prev, loading: true, error: null }));
      const schema: SchemaInfo = await backend.sql_engine.getSchema();
      setSchemaState({ data: schema, loading: false, error: null });
    } catch (error) {
      console.error('Failed to load database schema:', error);
      setSchemaState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }, []);

  // Create completion provider with better error handling
  const createCompletionProvider = useCallback((schema: SchemaInfo): monaco.IDisposable => {
    return monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: ['.', ' '],
      provideCompletionItems: (model, position) => {
        try {
          const suggestions: monaco.languages.CompletionItem[] = [];
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          };
          
          // Add table names
          schema.tables.forEach(tableName => {
            suggestions.push({
              label: tableName,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: tableName,
              documentation: `Table: ${tableName}`,
              detail: 'Table',
              range: range,
              sortText: `0_${tableName}` // Prioritize tables
            });
          });
          
          // Add column names for each table
          Object.entries(schema.schema).forEach(([tableName, columns]) => {
            columns.forEach(column => {
              // Qualified column name
              suggestions.push({
                label: `${tableName}.${column.name}`,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: `${tableName}.${column.name}`,
                documentation: {
                  value: `**Column:** ${column.name}\n\n**Type:** ${column.type}\n\n**Nullable:** ${column.nullable ? 'Yes' : 'No'}\n\n**Table:** ${tableName}`
                },
                detail: `${tableName}.${column.name} (${column.type})`,
                filterText: `${tableName} ${column.name}`,
                range: range,
                sortText: `1_${tableName}_${column.name}`
              });
              
              // Unqualified column name
              suggestions.push({
                label: column.name,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: column.name,
                documentation: {
                  value: `**Column:** ${column.name}\n\n**Type:** ${column.type}\n\n**Nullable:** ${column.nullable ? 'Yes' : 'No'}\n\n**Table:** ${tableName}`
                },
                detail: `${column.name} (${column.type})`,
                range: range,
                sortText: `2_${column.name}`
              });
            });
          });
          
          // Add SQL keywords
          sqlKeywords.forEach(keyword => {
            suggestions.push({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              documentation: `SQL keyword: ${keyword}`,
              detail: 'Keyword',
              range: range,
              sortText: `3_${keyword}`
            });
          });
          
          return { suggestions };
        } catch (error) {
          console.error('Error in completion provider:', error);
          return { suggestions: [] };
        }
      }
    });
  }, [sqlKeywords]);

  // Define themes once
  useEffect(() => {
    try {
      // Dark theme
      monaco.editor.defineTheme('sql-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'keyword.sql', foreground: '569cd6' },
          { token: 'identifier.sql', foreground: '9cdcfe' },
          { token: 'string.sql', foreground: 'ce9178' },
          { token: 'number.sql', foreground: 'b5cea8' },
          { token: 'comment.sql', foreground: '6a9955' },
          { token: 'operator.sql', foreground: 'd4d4d4' }
        ],
        colors: {
          'editor.background': '#0f0f23',
          'editor.foreground': '#d4d4d4',
          'editorLineNumber.foreground': '#858585',
          'editor.selectionBackground': '#264f78',
          'editor.inactiveSelectionBackground': '#3a3d41',
          'editorCursor.foreground': '#ffffff',
          'editor.lineHighlightBackground': '#2a2d2e'
        }
      });

      // Light theme
      monaco.editor.defineTheme('sql-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'keyword.sql', foreground: '0000ff' },
          { token: 'identifier.sql', foreground: '001080' },
          { token: 'string.sql', foreground: 'a31515' },
          { token: 'number.sql', foreground: '098658' },
          { token: 'comment.sql', foreground: '008000' },
          { token: 'operator.sql', foreground: '000000' }
        ],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#000000',
          'editorLineNumber.foreground': '#237893',
          'editor.selectionBackground': '#add6ff',
          'editor.inactiveSelectionBackground': '#e5ebf1',
          'editorCursor.foreground': '#000000',
          'editor.lineHighlightBackground': '#f0f0f0'
        }
      });
    } catch (error) {
      console.error('Failed to define Monaco themes:', error);
    }
  }, []);

  // Load schema on mount
  useEffect(() => {
    loadSchema();
  }, [loadSchema]);

  // Initialize editor (only once)
  useEffect(() => {
    if (!editorRef.current) return;

    try {
      // Create the editor
      const editor = monaco.editor.create(editorRef.current, {
        value: value,
        language: 'sql',
        theme: currentTheme === 'dark' ? 'sql-dark' : 'sql-light',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: true,
        scrollBeyondLastColumn: 5,
        padding: { 
          top: 10, 
          bottom: 200 
        },
        wordWrap: 'on',
        lineNumbers: 'on',
        glyphMargin: false,
        folding: true,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 3,
        renderLineHighlight: 'line',
        selectOnLineNumbers: true,
        roundedSelection: false,
        readOnly: false,
        cursorStyle: 'line',
        fontSize: 14,
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        tabSize: 2,
        insertSpaces: true,
        suggest: {
          showKeywords: true,
          showSnippets: true,
          showFunctions: true,
          showVariables: true,
          showClasses: true,
          showFields: true,
          filterGraceful: true,
          snippetsPreventQuickSuggestions: false
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false
        },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        tabCompletion: 'on',
        parameterHints: {
          enabled: true
        }
      });

      const disposables: monaco.IDisposable[] = [];

      // Handle value changes
      const changeDisposable = editor.onDidChangeModelContent(() => {
        const newValue = editor.getValue();
        onChange(newValue);
      });
      disposables.push(changeDisposable);

      // Handle Ctrl+Enter for execution
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
          if (onExecute) {
            onExecute();
          }
        }
      );

      editorInstanceRef.current = {
        editor,
        disposables,
        completionProvider: undefined
      };

      // Cleanup function
      return () => {
        if (editorInstanceRef.current) {
          editorInstanceRef.current.disposables.forEach(d => d.dispose());
          editorInstanceRef.current.completionProvider?.dispose();
          editorInstanceRef.current.editor.dispose();
          editorInstanceRef.current = null;
        }
      };
    } catch (error) {
      console.error('Failed to initialize Monaco Editor:', error);
    }
  }, []); // Only initialize once

  // Update completion provider when schema changes
  useEffect(() => {
    if (!editorInstanceRef.current) return;

    // Dispose old completion provider
    if (editorInstanceRef.current.completionProvider) {
      editorInstanceRef.current.completionProvider.dispose();
      editorInstanceRef.current.completionProvider = undefined;
    }

    // Create new completion provider if schema is available
    if (schemaState.data && !schemaState.loading && !schemaState.error) {
      try {
        editorInstanceRef.current.completionProvider = createCompletionProvider(schemaState.data);
      } catch (error) {
        console.error('Failed to create completion provider:', error);
      }
    }
  }, [schemaState, createCompletionProvider]);

  // Update editor value when prop changes (avoid infinite loops)
  useEffect(() => {
    const editor = editorInstanceRef.current?.editor;
    if (editor && editor.getValue() !== value) {
      const position = editor.getPosition();
      const selection = editor.getSelection();
      
      editor.setValue(value);
      
      // Restore cursor position and selection
      if (position) {
        editor.setPosition(position);
      }
      if (selection) {
        editor.setSelection(selection);
      }
      
      // Ensure editor maintains focus
      editor.focus();
    }
  }, [value]);

  // Update theme when it changes
  useEffect(() => {
    const editor = editorInstanceRef.current?.editor;
    if (editor) {
      try {
        monaco.editor.setTheme(currentTheme === 'dark' ? 'sql-dark' : 'sql-light');
      } catch (error) {
        console.error('Failed to update Monaco theme:', error);
      }
    }
  }, [currentTheme]);

  // Theme change observer for auto theme
  useEffect(() => {
    if (theme !== 'auto') return;

    const handleThemeChange = () => {
      const editor = editorInstanceRef.current?.editor;
      if (editor) {
        try {
          const isDark = document.documentElement.classList.contains('dark');
          monaco.editor.setTheme(isDark ? 'sql-dark' : 'sql-light');
        } catch (error) {
          console.error('Failed to update theme on change:', error);
        }
      }
    };

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      observer.disconnect();
    };
  }, [theme]);

  return (
    <div className="relative flex h-full">
      <div 
        ref={editorRef} 
        style={{ height: '100%', width: '100%' }}
        className="border rounded-md overflow-hidden bg-background"
      />
      
      {/* Schema loading indicator */}
      {schemaState.loading && (
        <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded border">
          Loading schema...
        </div>
      )}
      
      {/* Schema error indicator */}
      {schemaState.error && (
        <div className="absolute top-2 right-2 text-xs text-destructive bg-background/80 px-2 py-1 rounded border">
          Schema error: {schemaState.error}
        </div>
      )}
      
      {/* Empty state placeholder */}
      {!value && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="text-muted-foreground text-sm">
            {placeholder}
          </div>
        </div>
      )}
    </div>
  );
}