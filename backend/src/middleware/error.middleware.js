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
      'Request body exceeds the limit for this endpoint.',
    );
  if (!(error instanceof ApiError)) {
    if (error.code === 11000)
      normalized = new ApiError(
        409,
        'RECORD_CONFLICT',
        'This record or reference already exists. Refresh before retrying.',
      );
    else if (
      error.name === 'ValidationError' ||
      error.name === 'StrictModeError'
    )
      normalized = new ApiError(
        422,
        'VALIDATION_ERROR',
        'Check the submitted fields and try again.',
      );
    else if (error.name === 'CastError')
      normalized = new ApiError(
        400,
        'INVALID_VALUE',
        'A submitted value is invalid.',
      );
    else if (
      [
        'MongoServerSelectionError',
        'MongoNetworkError',
        'MongoNetworkTimeoutError',
      ].includes(error.name)
    )
      normalized = new ApiError(
        503,
        'DATABASE_UNAVAILABLE',
        'The service is temporarily unavailable. Check the action status before retrying a submission.',
      );
  }
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
