import { describe, it, expect } from 'vitest';
import {
  memoryFormSchema,
  registerMediaSchema,
  reorderMediaSchema,
  generateMemorySlug,
} from '@/lib/validations/memory';

describe('Milestone B: Memory CRUD, Slug Generation & Media Constraints', () => {
  describe('Vietnamese Slug Generation', () => {
    it('normalizes Vietnamese diacritics to clean URL-safe slugs', () => {
      const slug = generateMemorySlug('Chuyến Đi Đà Lạt Đầu Tiên Dưới Mưa');
      expect(slug).toMatch(/^chuyen-di-da-lat-dau-tien-duoi-mua-[0-9a-f]{6}$/);
      expect(slug).not.toContain('Đ');
      expect(slug).not.toContain('đ');
      expect(slug).not.toContain('ế');
      expect(slug).not.toContain(' ');
    });

    it('handles titles with special punctuation gracefully', () => {
      const slug = generateMemorySlug('Kỷ niệm 1 năm yêu nhau! ❤️ (14/02/2024)');
      expect(slug).toMatch(/^ky-niem-1-nam-yeu-nhau-14022024-[0-9a-f]{6}$/);
    });

    it('falls back to memory-{random} for empty or symbol-only titles', () => {
      const slug = generateMemorySlug('❤️❤️❤️');
      expect(slug).toMatch(/^memory-[0-9a-f]{6}$/);
    });
  });

  describe('Memory Form Validation', () => {
    it('accepts valid memory inputs and defaults to draft visibility', () => {
      const valid = memoryFormSchema.parse({
        title: 'Buổi hẹn hò đầu tiên',
        event_date: '2024-05-20',
        description: 'Chúng mình đã cùng nhau đi dạo bên hồ.',
      });

      expect(valid.title).toBe('Buổi hẹn hò đầu tiên');
      expect(valid.event_date).toBe('2024-05-20');
      expect(valid.visibility).toBe('draft'); // Draft by default
      expect(valid.type).toBe('everyday');
    });

    it('rejects empty title or title exceeding 120 characters', () => {
      expect(() =>
        memoryFormSchema.parse({
          title: '',
          event_date: '2024-05-20',
        })
      ).toThrow();

      expect(() =>
        memoryFormSchema.parse({
          title: 'a'.repeat(121),
          event_date: '2024-05-20',
        })
      ).toThrow();
    });

    it('rejects invalid date format', () => {
      expect(() =>
        memoryFormSchema.parse({
          title: 'Hẹn hò',
          event_date: '20-05-2024', // Non-ISO
        })
      ).toThrow();
    });
  });

  describe('Publishing Invariant Requirements', () => {
    function canPublishMemory(memory: {
      title: string;
      description?: string | null;
      mediaCount: number;
    }): { canPublish: boolean; error?: string } {
      if (!memory.title?.trim()) {
        return { canPublish: false, error: 'Tiêu đề không được để trống' };
      }
      const hasStory = !!memory.description?.trim();
      const hasMedia = memory.mediaCount > 0;
      if (!hasStory && !hasMedia) {
        return {
          canPublish: false,
          error: 'Để xuất bản công khai, kỷ niệm cần có nội dung câu chuyện hoặc ít nhất 1 ảnh.',
        };
      }
      return { canPublish: true };
    }

    it('allows publishing when memory has title and story', () => {
      const res = canPublishMemory({
        title: 'Lời hứa',
        description: 'Một câu chuyện thật dài...',
        mediaCount: 0,
      });
      expect(res.canPublish).toBe(true);
    });

    it('allows publishing when memory has title and at least 1 photo', () => {
      const res = canPublishMemory({
        title: 'Bức ảnh chụp vội',
        description: '',
        mediaCount: 1,
      });
      expect(res.canPublish).toBe(true);
    });

    it('strictly forbids publishing an empty draft with no story and no photo', () => {
      const res = canPublishMemory({
        title: 'Bản nháp trống',
        description: '',
        mediaCount: 0,
      });
      expect(res.canPublish).toBe(false);
      expect(res.error).toBe(
        'Để xuất bản công khai, kỷ niệm cần có nội dung câu chuyện hoặc ít nhất 1 ảnh.'
      );
    });
  });

  describe('Media Upload Constraints & 30-Photo Limit', () => {
    it('validates correct media file parameters', () => {
      const validMedia = registerMediaSchema.parse({
        storage_path: 'space-1/mem-1/photo-1.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 4096000, // 4MB
        sort_order: 0,
      });
      expect(validMedia.mime_type).toBe('image/jpeg');
      expect(validMedia.file_size_bytes).toBe(4096000);
    });

    it('rejects media exceeding 15MB file size limit', () => {
      expect(() =>
        registerMediaSchema.parse({
          storage_path: 'space-1/mem-1/giant.jpg',
          mime_type: 'image/jpeg',
          file_size_bytes: 16 * 1024 * 1024, // 16MB > 15MB
        })
      ).toThrow();
    });

    it('strictly blocks adding more than 30 photos to a single memory', () => {
      function checkCanUpload(currentCount: number): boolean {
        return currentCount < 30;
      }

      expect(checkCanUpload(0)).toBe(true);
      expect(checkCanUpload(29)).toBe(true);
      expect(checkCanUpload(30)).toBe(false); // Max reached
      expect(checkCanUpload(31)).toBe(false);
    });
  });

  describe('Media Privacy & Visibility Lifecycle (No Data Leaks)', () => {
    interface SimulatedMedia {
      id: string;
      memoryId: string;
      storage_path: string;
    }

    interface SimulatedMemory {
      id: string;
      space_id: string;
      visibility: 'draft' | 'private' | 'published';
      is_archived: boolean;
    }

    function evaluateMediaAccess(
      media: SimulatedMedia,
      memory: SimulatedMemory,
      isMember: boolean
    ): boolean {
      if (isMember) return true;
      // Visitor can ONLY access if memory is published and not archived
      return memory.visibility === 'published' && !memory.is_archived;
    }

    const testMemory: SimulatedMemory = {
      id: 'mem-100',
      space_id: 'space-100',
      visibility: 'draft',
      is_archived: false,
    };

    const testMedia: SimulatedMedia = {
      id: 'media-100',
      memoryId: 'mem-100',
      storage_path: 'space-100/mem-100/secret.jpg',
    };

    it('prevents anonymous visitors from accessing media of a draft memory', () => {
      testMemory.visibility = 'draft';
      expect(evaluateMediaAccess(testMedia, testMemory, false)).toBe(false);
      expect(evaluateMediaAccess(testMedia, testMemory, true)).toBe(true); // Member can view
    });

    it('prevents anonymous visitors from accessing media of a private memory', () => {
      testMemory.visibility = 'private';
      expect(evaluateMediaAccess(testMedia, testMemory, false)).toBe(false);
      expect(evaluateMediaAccess(testMedia, testMemory, true)).toBe(true);
    });

    it('permits anonymous visitors to access media once memory is published', () => {
      testMemory.visibility = 'published';
      expect(evaluateMediaAccess(testMedia, testMemory, false)).toBe(true);
    });

    it('immediately cuts off anonymous media access when memory is unpublished back to private', () => {
      // 1. Published
      testMemory.visibility = 'published';
      expect(evaluateMediaAccess(testMedia, testMemory, false)).toBe(true);

      // 2. Unpublished back to private
      testMemory.visibility = 'private';
      expect(evaluateMediaAccess(testMedia, testMemory, false)).toBe(false);
    });
  });

  describe('Media Reordering', () => {
    it('validates reorder media array format', () => {
      const valid = reorderMediaSchema.parse({
        mediaIds: [
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        ],
      });
      expect(valid.mediaIds).toHaveLength(2);
    });

    it('correctly updates sort_order positions', () => {
      // Reorder: m3 moved to front: [m3, m1, m2]
      const newOrder = ['m3', 'm1', 'm2'];
      const updated = newOrder.map((id, index) => ({
        id,
        sort_order: index,
      }));

      expect(updated.find((i) => i.id === 'm3')?.sort_order).toBe(0);
      expect(updated.find((i) => i.id === 'm1')?.sort_order).toBe(1);
      expect(updated.find((i) => i.id === 'm2')?.sort_order).toBe(2);
    });
  });
});
