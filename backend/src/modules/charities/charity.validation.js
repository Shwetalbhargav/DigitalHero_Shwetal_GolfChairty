import { ApiError } from '../../utils/ApiError.js';

export const CATEGORY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return (
      ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !/\s/.test(value)
    );
  } catch {
    return false;
  }
}

export function parseCharityId(value) {
  if (typeof value !== 'string' || !/^[a-fA-F0-9]{24}$/.test(value))
    throw new ApiError(
      400,
      'INVALID_ID',
      'Charity ID must be a 24-character hexadecimal ObjectId.',
    );
  return value;
}

export function parseCharityQuery(query) {
  const allowed = new Set(['q', 'category', 'page', 'limit']);
  for (const key of Object.keys(query))
    if (!allowed.has(key) || typeof query[key] !== 'string')
      throw new ApiError(
        400,
        'INVALID_QUERY',
        'Use only single q, category, page and limit query parameters.',
      );
  const q = query.q?.trim() || '';
  if (
    q.length > 100 ||
    [...q].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    throw new ApiError(
      400,
      'INVALID_QUERY',
      'q must contain at most 100 characters without control characters.',
    );
  const category = query.category?.trim().toLowerCase() || '';
  if (category && (category.length > 64 || !CATEGORY_PATTERN.test(category)))
    throw new ApiError(
      400,
      'INVALID_QUERY',
      'category must be a category slug of at most 64 characters.',
    );
  function integer(key, fallback, maximum) {
    if (query[key] === undefined) return fallback;
    if (!/^[1-9]\d*$/.test(query[key]))
      throw new ApiError(
        400,
        'INVALID_QUERY',
        key + ' must be an integer between 1 and ' + maximum + '.',
      );
    const value = Number(query[key]);
    if (!Number.isSafeInteger(value) || value > maximum)
      throw new ApiError(
        400,
        'INVALID_QUERY',
        key + ' must be an integer between 1 and ' + maximum + '.',
      );
    return value;
  }
  return {
    q,
    category,
    page: integer('page', 1, 1000),
    limit: integer('limit', 12, 50),
  };
}

export function escapeSearch(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
