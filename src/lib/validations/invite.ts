import { z } from 'zod';
import crypto from 'crypto';

export const createInviteSchema = z.object({
  space_id: z.string().uuid('ID không gian không hợp lệ'),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(10, 'Mã mời không hợp lệ'),
});

export function hashInviteToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
