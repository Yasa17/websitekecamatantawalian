import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const hashPassword = (password, salt = randomBytes(16).toString('hex')) => ({
  passwordHash: scryptSync(password, salt, 64).toString('hex'),
  passwordSalt: salt,
});

export const passwordMatches = (password, admin) => {
  const actual = Buffer.from(admin.passwordHash, 'hex');
  const expected = scryptSync(password, admin.passwordSalt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const hashSessionToken = (token) =>
  createHash('sha256').update(token).digest('hex');

export const createSessionToken = () => randomBytes(32).toString('hex');

export const publicAdmin = ({ passwordHash: _hash, passwordSalt: _salt, ...admin }) => admin;
