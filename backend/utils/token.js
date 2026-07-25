import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'camp-david-2026-super-secret-key-change-in-production';
const EXPIRES_IN = '8h'; // Session expires after 8 hours

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      status: user.status,
      permissions: user.permissions || [],
      forcePasswordChange: user.forcePasswordChange,
    },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
