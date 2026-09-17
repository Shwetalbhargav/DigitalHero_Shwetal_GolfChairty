import jwt from 'jsonwebtoken';
export const SESSION_COOKIE = 'dh_session';
export function generateToken(user, secret) {
  return jwt.sign({ version: user.tokenVersion }, secret, {
    algorithm: 'HS256',
    subject: String(user._id),
    issuer: 'digital-heroes',
    audience: 'digital-heroes-web',
    expiresIn: '7d',
  });
}
export function verifyToken(token, secret) {
  return jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: 'digital-heroes',
    audience: 'digital-heroes-web',
  });
}
export function cookieOptions(config) {
  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/api',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}
