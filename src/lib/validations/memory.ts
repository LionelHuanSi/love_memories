import { z } from 'zod';
import crypto from 'crypto';

export const memoryFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Tiêu đề không được để trống')
    .max(120, 'Tiêu đề tối đa 120 ký tự'),
  event_date: z
    .string()
    .min(1, 'Vui lòng chọn ngày diễn ra kỷ niệm')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày không hợp lệ (YYYY-MM-DD)'),
  description: z.string().max(3000).optional().nullable().default(''),
  location_label: z.string().max(100, 'Địa điểm tối đa 100 ký tự').optional().nullable(),
  type: z.enum(['date', 'trip', 'milestone', 'everyday', 'other']).default('everyday'),
  visibility: z.enum(['draft', 'private', 'published']).default('draft'),
  constellation_id: z.string().uuid().optional().nullable(),
});

export type MemoryFormValues = z.infer<typeof memoryFormSchema>;

export const registerMediaSchema = z.object({
  storage_path: z.string().min(1, 'Đường dẫn storage không được để trống'),
  thumbnail_path: z.string().optional().nullable(),
  mime_type: z.string().default('image/jpeg'),
  file_size_bytes: z.number().int().nonnegative().max(15728640, 'Kích thước file tối đa 15MB').default(102400),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  alt_text: z.string().max(255).optional().nullable(),
  sort_order: z.number().int().nonnegative().default(0),
});

export type RegisterMediaValues = z.infer<typeof registerMediaSchema>;

export const reorderMediaSchema = z.object({
  mediaIds: z.array(z.string().uuid()).min(1),
});

export type ReorderMediaValues = z.infer<typeof reorderMediaSchema>;

/**
 * Generate a clean URL-friendly slug from Vietnamese title + random 6-char hex suffix
 */
export function generateMemorySlug(title: string): string {
  // Normalize Vietnamese diacritics
  const normalized = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);

  const randomSuffix = crypto.randomBytes(3).toString('hex');
  return `${normalized || 'memory'}-${randomSuffix}`;
}
