import { ApiError } from '../utils/ApiError.js';
export function errorHandler(error, req, res, _next) {
  if (res.headersSent) return _next(error);
  let normalized = error;
  if (error.type === 'entity.parse.failed')
    normalized = new ApiError(
      400,
      'INVALID_JSON',
      'Request body must contain valid JSON.',
    );
  if (error.type === 'entity.too.large')
    normalized = new ApiError(
      413,
      'PAYLOAD_TOO_LARGE',
      'Request body exceeds the 16 KB limit.',
    );
  const known = normalized instanceof ApiError;
  if (!known)
    console.error(
      JSON.stringify({ event: 'request_failed', requestId: req.id }),
    );
  res.status(known ? normalized.status : 500).json({
    success: false,
    error: {
      code: known ? normalized.code : 'INTERNAL_ERROR',
      message: known ? normalized.message : 'An unexpected error occurred.',
    },
    requestId: req.id,
  });
}
