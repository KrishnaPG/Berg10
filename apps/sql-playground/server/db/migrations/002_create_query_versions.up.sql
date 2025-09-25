-- Drop old query_history table
DROP TABLE IF EXISTS query_history;

-- Create queries table to store query entries
CREATE TABLE queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id VARCHAR(255)
);

-- Create query_versions table to store individual executions
CREATE TABLE query_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_time_ms BIGINT,
  row_count BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  error_message TEXT,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(query_id, version_number)
);

-- Index for faster queries
CREATE INDEX idx_queries_updated_at ON queries(updated_at DESC);
CREATE INDEX idx_query_versions_query_id ON query_versions(query_id);
CREATE INDEX idx_query_versions_executed_at ON query_versions(executed_at DESC);

-- Function to update queries.updated_at when a new version is added
CREATE OR REPLACE FUNCTION update_query_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE queries 
  SET updated_at = NEW.executed_at 
  WHERE id = NEW.query_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update queries.updated_at
CREATE TRIGGER trigger_update_query_updated_at
  AFTER INSERT ON query_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_query_updated_at();