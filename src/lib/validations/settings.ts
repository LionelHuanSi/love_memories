import { z } from 'zod';

export const updateSpaceSettingsSchema = z.object({
  public_title: z.string().min(1, 'Tiêu đề không được để trống').max(100),
  tagline: z.string().max(200).optional().nullable(),
  relationship_start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD không hợp lệ')
    .optional()
    .nullable(),
  show_day_counter: z.boolean().default(false),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Mã màu Hex không hợp lệ').default('#A78BFA'),
  musicUrl: z
    .string()
    .trim()
    .refine(
      (val) => !val || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/'),
      'Đường dẫn âm nhạc không hợp lệ (hỗ trợ link http/https hoặc file nội bộ /ten-bai-hat.mp3)'
    )
    .optional()
    .nullable()
    .or(z.literal('')),
});

export type UpdateSpaceSettingsValues = z.infer<typeof updateSpaceSettingsSchema>;
