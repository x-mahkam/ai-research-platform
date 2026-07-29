export * from '../../src/types/index.js';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  timestamp: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
