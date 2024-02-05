import rateLimit from 'express-rate-limit';

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
});

export const checkRefreshTokenLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
});

export const verifySessionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 25,
});

export const refreshTokenLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 8,
});
