import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, Table, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTabContext } from '../contexts/TabContext';
import backend from '~backend/client';

export function SchemaExplorer() {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const { createTab } = useTabContext();

  const { data: schemaData, isLoading } = useQuery({
    queryKey: ['schema'],
    queryFn: () => backend.sql_engine.getSchema(),
  });

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const generateSelectQuery = (tableName: string) => {
    const query = `SELECT * FROM ${tableName} LIMIT 100;`;
    createTab({
      query,
      title: `${tableName}`,
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
        <p className="text-xs text-muted-foreground mt-2">Loading schema...</p>
      </div>
    );
  }

  if (!schemaData?.tables.length) {
    return (
      <div className="p-4 text-center">
        <Database className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No tables found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Database Schema
          </h3>
        </div>

        <div className="space-y-1">
          {schemaData.tables.map((tableName: string) => {
            const isExpanded = expandedTables.has(tableName);
            const columns = schemaData.schema[tableName] || [];

            return (
              <div key={tableName} className="border rounded-lg">
                <div
                  className="flex items-center justify-between p-2 hover:bg-muted/50 cursor-pointer"
                  onClick={() => toggleTable(tableName)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <Table className="w-4 h-4" />
                    <span className="text-sm font-medium">{tableName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {columns.length}
                    </Badge>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      generateSelectQuery(tableName);
                    }}
                  >
                    Query
                  </Button>
                </div>

                {isExpanded && (
                  <div className="border-t bg-muted/20">
                    {columns.map((column: any) => (
                      <div
                        key={column.name}
                        className="flex items-center justify-between px-6 py-1 text-xs"
                      >
                        <span className="font-mono">{column.name}</span>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {column.type}
                          </Badge>
                          {column.nullable && (
                            <Badge variant="secondary" className="text-xs">
                              NULL
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
