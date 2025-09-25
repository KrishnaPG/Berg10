CREATE TABLE query_history (
  id BIGSERIAL PRIMARY KEY,
  query_text TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_time_ms BIGINT,
  row_count BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  error_message TEXT,
  user_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sample_data (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  age INTEGER,
  department VARCHAR(100),
  salary DOUBLE PRECISION,
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data for testing
INSERT INTO sample_data (name, email, age, department, salary, hire_date, is_active) VALUES
('John Doe', 'john.doe@example.com', 30, 'Engineering', 75000.00, '2022-01-15', true),
('Jane Smith', 'jane.smith@example.com', 28, 'Marketing', 65000.00, '2022-03-20', true),
('Bob Johnson', 'bob.johnson@example.com', 35, 'Engineering', 85000.00, '2021-09-10', true),
('Alice Brown', 'alice.brown@example.com', 32, 'HR', 60000.00, '2022-02-28', true),
('Charlie Wilson', 'charlie.wilson@example.com', 29, 'Sales', 70000.00, '2022-04-12', false),
('Diana Lee', 'diana.lee@example.com', 27, 'Engineering', 78000.00, '2022-05-18', true),
('Eva Martinez', 'eva.martinez@example.com', 33, 'Marketing', 68000.00, '2021-11-22', true),
('Frank Chen', 'frank.chen@example.com', 31, 'Engineering', 82000.00, '2021-12-05', true),
('Grace Kim', 'grace.kim@example.com', 26, 'Design', 72000.00, '2022-06-30', true),
('Henry Davis', 'henry.davis@example.com', 34, 'Sales', 75000.00, '2021-10-14', true);
