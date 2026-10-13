import type { Paginated } from '@iitr/shared';

export const PAGE_SIZE = 20;

export function pageArgs(page: number, pageSize = PAGE_SIZE) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function paginated<T>(results: T[], total: number, page: number, pageSize = PAGE_SIZE): Paginated<T> {
  return { results, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
