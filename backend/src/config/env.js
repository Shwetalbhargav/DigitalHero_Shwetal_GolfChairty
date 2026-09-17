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
      url.hostname.includes('*') ||
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
  const trustProxy = source.TRUST_PROXY ?? '0';
  if (!['0', '1'].includes(trustProxy))
    issues.push('TRUST_PROXY must be 0 or 1');
  if (nodeEnv === 'production' && !clientOrigin?.startsWith('https://'))
    issues.push('CLIENT_ORIGIN must use HTTPS in production');
  const dbTimeoutMs = integer('DB_TIMEOUT_MS', 3000, 60000);
  const shutdownTimeoutMs = integer('SHUTDOWN_TIMEOUT_MS', 10000, 120000);
  const authSecret = source.AUTH_SECRET;
  if (typeof authSecret !== 'string' || authSecret.length < 32)
    issues.push(
      'AUTH_SECRET is required and must contain at least 32 characters',
    );
  if (
    nodeEnv === 'production' &&
    /replace-with|test-only|fixture|demo-secret/i.test(authSecret || '')
  )
    issues.push('AUTH_SECRET must be a newly generated production secret');
  const prizePercent = integer('PRIZE_PERCENT', 50, 90);
  const paymentMode = source.PAYMENT_MODE || 'disabled';
  if (
    !['disabled', 'simulated', 'stripe'].includes(paymentMode) ||
    (nodeEnv === 'production' && paymentMode === 'simulated')
  )
    issues.push(
      'PAYMENT_MODE must be disabled or simulated; simulated mode is forbidden in production',
    );
  const currency = source.CURRENCY || 'GBP';
  if (paymentMode === 'stripe' && (!/^sk_test_/.test(source.STRIPE_SECRET_KEY || '') || !/^whsec_/.test(source.STRIPE_WEBHOOK_SECRET || ''))) issues.push('Stripe sandbox requires STRIPE_SECRET_KEY (sk_test_) and STRIPE_WEBHOOK_SECRET');
  const emailMode = source.EMAIL_MODE || 'disabled';
  if (!['disabled', 'demo', 'resend'].includes(emailMode) || (emailMode === 'demo' && nodeEnv !== 'test')) issues.push('EMAIL_MODE demo is restricted to isolated test environments');
  if (emailMode === 'resend' && (!source.RESEND_API_KEY || !source.EMAIL_FROM)) issues.push('Resend requires RESEND_API_KEY and EMAIL_FROM');
  const proofStorage =
    source.PROOF_STORAGE || (nodeEnv === 'production' ? 'disabled' : 'local');
  if (
    !['disabled', 'local', 'cloudinary'].includes(proofStorage) ||
    (nodeEnv === 'production' && proofStorage === 'local')
  )
    issues.push(
      'PROOF_STORAGE must be disabled, local or cloudinary; local is forbidden in production',
    );
  const cloudinary = {
    cloud_name: source.CLOUDINARY_CLOUD_NAME,
    api_key: source.CLOUDINARY_API_KEY,
    api_secret: source.CLOUDINARY_API_SECRET,
  };
  if (
    proofStorage === 'cloudinary' &&
    (!/^[a-z0-9_-]+$/i.test(cloudinary.cloud_name || '') ||
      !cloudinary.api_key ||
      !cloudinary.api_secret)
  )
    issues.push(
      'Cloudinary proof storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET',
    );
  const monthlyPriceMinor = integer('MONTHLY_PRICE_MINOR', 1900, 1000000);
  const yearlyPriceMinor = integer('YEARLY_PRICE_MINOR', 19000, 12000000);
  if (yearlyPriceMinor >= monthlyPriceMinor * 12)
    issues.push(
      'YEARLY_PRICE_MINOR must be discounted below 12 monthly payments',
    );
  if (!['GBP', 'USD', 'EUR'].includes(currency))
    issues.push('CURRENCY must be GBP, USD or EUR (two-decimal currencies)');
  if (issues.length)
    throw new Error('Invalid environment configuration: ' + issues.join('; '));
  return Object.freeze({
    nodeEnv,
    mongodbUri,
    clientOrigin,
    port,
    trustProxy: Number(trustProxy),
    dbTimeoutMs,
    shutdownTimeoutMs,
    authSecret,
    paymentMode,
    stripeSecretKey: source.STRIPE_SECRET_KEY,
    stripeWebhookSecret: source.STRIPE_WEBHOOK_SECRET,
    currency,
    emailMode,
    resendApiKey: source.RESEND_API_KEY,
    emailFrom: source.EMAIL_FROM,
    proofStorage,
    cloudinary,
    monthlyPriceMinor,
    yearlyPriceMinor,
    prizePercent,
    maxContributionPercent: 100 - prizePercent,
  });
}
