import { randomBytes } from 'crypto';

// Long random single-match-scoped tokens for red/blue links.
export function generateToken(): string {
  return randomBytes(24).toString('base64url');
}
