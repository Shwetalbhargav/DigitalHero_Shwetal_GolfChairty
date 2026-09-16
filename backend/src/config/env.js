export function parseEnv(source) {
  const issues = [];
  const nodeEnv = source.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv))
    issues.push('NODE_ENV must be development, test or production');
  const mongodbUri = source.MONGODB_URI?.trim();
  if (!mongodbUri || !/^mongodb(?:\+srv)?:\/\/[^\s]+$/.test(mongodbUri))
    issues.push(
      'MONGODB_URI is required and must use mongodb:// or mongodb+srv://',
    );
  const clientOrigin = source.CLIENT_ORIGIN?.trim();
  try {
    const url = new URL(clientOrigin);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.origin !== clientOrigin
    )
      throw new Error();
  } catch {
    issues.push(
      'CLIENT_ORIGIN is required and must be an exact HTTP(S) origin without a trailing slash',
    );
  }
  function integer(key, fallback, maximum) {
    const raw = source[key] ?? String(fallback);
    const value = Number(raw);
    if (
      !/^\d+$/.test(raw) ||
      !Number.isSafeInteger(value) ||
      value < 1 ||
      value > maximum
    )
      issues.push(key + ' must be an integer between 1 and ' + maximum);
    return value;
  }
  const port = integer('PORT', 4000, 65535);
  const dbTimeoutMs = integer('DB_TIMEOUT_MS', 3000, 60000);
  const shutdownTimeoutMs = integer('SHUTDOWN_TIMEOUT_MS', 10000, 120000);
  const authSecret = source.AUTH_SECRET;
  if (typeof authSecret !== 'string' || authSecret.length < 32)
    issues.push(
      'AUTH_SECRET is required and must contain at least 32 characters',
    );
  const prizePercent = integer('PRIZE_PERCENT', 50, 90);
  const paymentMode = source.PAYMENT_MODE || 'disabled';
  if (
    !['disabled', 'simulated'].includes(paymentMode) ||
    (nodeEnv === 'production' && paymentMode === 'simulated')
  )
    issues.push(
      'PAYMENT_MODE must be disabled or simulated; simulated mode is forbidden in production',
    );
  const currency = source.CURRENCY || 'GBP';
  if (!['GBP', 'USD', 'EUR'].includes(currency))
    issues.push('CURRENCY must be GBP, USD or EUR (two-decimal currencies)');
  if (issues.length)
    throw new Error('Invalid environment configuration: ' + issues.join('; '));
  return Object.freeze({
    nodeEnv,
    mongodbUri,
    clientOrigin,
    port,
    dbTimeoutMs,
    shutdownTimeoutMs,
    authSecret,
    paymentMode,
    currency,
    prizePercent,
    maxContributionPercent: 100 - prizePercent,
  });
}
