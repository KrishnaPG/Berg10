// API request and response types
export interface APIRequest {
  params?: Record<string, any>;
  query?: Record<string, any>;
  body?: any;
}

export interface APIResponse {
  status: number;
  data?: any;
  error?: string;
}

// REST API endpoint types
export interface CreateRepositoryRequest {
  name: string;
  bare?: boolean;
  cloneUrl?: string;
  mirror?: boolean;
}

export interface UpdateRepositoryRequest {
  name?: string;
  config?: Record<string, string>;
}

export interface CloneRepositoryRequest {
  url: string;
  directory: string;
  bare?: boolean;
  mirror?: boolean;
  branch?: string;
  depth?: number;
}

export interface GarbageCollectRequest {
  aggressive?: boolean;
  auto?: boolean;
  prune?: boolean;
}

// GraphQL types
export interface GraphQLQuery {
  query: string;
  variables?: Record<string, any>;
}

export interface GraphQLMutation {
  mutation: string;
  variables?: Record<string, any>;
}

export interface GraphQLSubscription {
  subscription: string;
  variables?: Record<string, any>;
}