/**
 * Pagination helper for list endpoints.
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export function paginationQuery(params: PaginationParams): Record<string, string | number | undefined> {
  return {
    page: params.page,
    limit: params.limit,
  };
}
