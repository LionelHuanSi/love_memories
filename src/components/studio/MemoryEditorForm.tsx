'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import ImageUploadManager, { type PendingUploadFile, type PendingUploadLink } from './ImageUploadManager';
import type { Memory, MemoryMedia, MemoryType, MemoryVisibility } from '@/lib/types/database';

interface MemoryEditorFormProps {
  initialData?: Memory & { memory_media?: MemoryMedia[] };
  isEditMode?: boolean;
}

export default function MemoryEditorForm({
  initialData,
  isEditMode = false,
}: MemoryEditorFormProps) {
  const router = useRouter();
  const [memoryId, setMemoryId] = useState<string | null>(initialData?.id || null);
  const [existingMedia, setExistingMedia] = useState<MemoryMedia[]>(initialData?.memory_media || []);
  const [pendingFiles, setPendingFiles] = useState<PendingUploadFile[]>([]);
  const [pendingLinks, setPendingLinks] = useState<PendingUploadLink[]>([]);

  const [title, setTitle] = useState(initialData?.title || '');
  const [eventDate, setEventDate] = useState(
    initialData?.event_date || new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState(initialData?.description || '');
  const [locationLabel, setLocationLabel] = useState(initialData?.location_label || '');
  const [type] = useState<MemoryType>(initialData?.type || 'milestone');
  const [visibility, setVisibility] = useState<MemoryVisibility>(initialData?.visibility || 'published');

  const [isDirty, setIsDirty] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Dirty state warning on window unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const refreshMedia = async () => {
    if (!memoryId) return;
    try {
      const res = await fetch(`/api/studio/memories/${memoryId}?_t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok && data.memory) {
        setExistingMedia(data.memory.memory_media || []);
      }
    } catch (err) {
      console.error('Failed to refresh media:', err);
    }
  };

  const handleDeleteMediaOptimistic = async (mediaId: string) => {
    // 1. Immediately remove from local state for instant responsive UI
    setExistingMedia((prev) => prev.filter((m) => m.id !== mediaId));

    try {
      const res = await fetch(`/api/studio/memories/${memoryId}/media?mediaId=${mediaId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error || 'Lỗi khi xóa ảnh' });
        refreshMedia();
      } else {
        router.refresh();
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối khi xóa ảnh' });
      refreshMedia();
    }
  };

  const handleSave = (targetVisibility: MemoryVisibility) => {
    if (!title.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tiêu đề cho kỷ niệm.' });
      return;
    }
    if (!eventDate) {
      setMessage({ type: 'error', text: 'Vui lòng chọn ngày diễn ra kỷ niệm.' });
      return;
    }

    setMessage(null);
    startTransition(async () => {
      try {
        const payload = {
          title: title.trim(),
          event_date: eventDate,
          description: description.trim() || null,
          location_label: locationLabel.trim() || null,
          type,
          visibility: targetVisibility,
        };

        if (isEditMode && memoryId) {
          // PATCH existing
          const res = await fetch(`/api/studio/memories/${memoryId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setMessage({ type: 'error', text: data.error || 'Lỗi khi cập nhật kỷ niệm' });
            return;
          }
          setVisibility(targetVisibility);
          setIsDirty(false);
          setMessage({
            type: 'success',
            text: 'Đã lưu thay đổi kỷ niệm thành công!',
          });
          router.refresh();
        } else if (!memoryId) {
          // POST new
          const res = await fetch('/api/studio/memories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok || !data.success || !data.memory) {
            setMessage({ type: 'error', text: data.error || 'Lỗi khi tạo kỷ niệm' });
            return;
          }
          const newMemoryId = data.memory.id;

          // Tải lên các file ảnh người dùng đã chọn trước khi lưu
          for (const item of pendingFiles) {
            try {
              const formData = new FormData();
              formData.append('file', item.file);
              formData.append('memoryId', newMemoryId);
              await fetch('/api/studio/uploads/file', {
                method: 'POST',
                body: formData,
              });
            } catch (err) {
              console.error('Lỗi tải file:', err);
            }
          }

          // Lưu các link ảnh / link Google Drive người dùng đã thêm trước khi lưu
          for (const item of pendingLinks) {
            try {
              await fetch(`/api/studio/memories/${newMemoryId}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  storage_path: item.url,
                  thumbnail_path: item.url,
                  mime_type: 'image/jpeg',
                  file_size_bytes: 102400,
                }),
              });
            } catch (err) {
              console.error('Lỗi lưu link ảnh:', err);
            }
          }

          setMemoryId(newMemoryId);
          setVisibility(targetVisibility);
          setIsDirty(false);
          setMessage({
            type: 'success',
            text: 'Đã tạo kỷ niệm và lưu hình ảnh thành công!',
          });
          router.push('/studio');
          router.refresh();
        }
      } catch (err: unknown) {
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Lỗi kết nối máy chủ',
        });
      }
    });
  };

  const handleDeleteMemory = async () => {
    if (!memoryId) return;
    if (
      !confirm(
        'Bạn có chắc chắn muốn xóa kỷ niệm này? Tất cả hình ảnh liên quan sẽ bị xóa khỏi hệ thống.'
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/studio/memories/${memoryId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          router.push('/studio');
          router.refresh();
        } else {
          const data = await res.json();
          setMessage({ type: 'error', text: data.error || 'Không thể xóa kỷ niệm' });
        }
      } catch {
        setMessage({ type: 'error', text: 'Lỗi kết nối khi xóa kỷ niệm' });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Sequence & Order Notice */}

      {message && (
        <div
          className={`p-4 rounded-none text-xs flex items-start gap-3 border ${message.type === 'error'
            ? 'bg-red-50 border-red-300 text-red-800'
            : 'bg-emerald-50 border-emerald-300 text-emerald-800'
            }`}
        >
          {message.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Main Info Card */}
      <div className="bg-white border border-zinc-300 p-6 sm:p-8 space-y-6 rounded-none">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">
            Tiêu đề kỷ niệm *
          </label>
          <input
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Ví dụ: First date - Đi xem conan"
            className="w-full px-4 py-3 bg-white border border-zinc-300 text-sm text-zinc-900 rounded-none focus:outline-none focus:border-black transition-colors"
          />
        </div>

        {/* Date & Location Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">
              Ngày diễn ra *
            </label>
            <input
              type="date"
              required
              value={eventDate}
              onChange={(e) => {
                setEventDate(e.target.value);
                setIsDirty(true);
              }}
              className="w-full px-4 py-2.5 bg-white border border-zinc-300 text-sm text-zinc-900 rounded-none focus:outline-none focus:border-black"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">
              Địa điểm (Tùy chọn)
            </label>
            <input
              type="text"
              maxLength={100}
              value={locationLabel}
              onChange={(e) => {
                setLocationLabel(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Ví dụ: Rạp chiếu phim CGV, Hà Nội"
              className="w-full px-4 py-2.5 bg-white border border-zinc-300 text-sm text-zinc-900 rounded-none focus:outline-none focus:border-black"
            />
          </div>
        </div>

        {/* Story */}
        <div>
          <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">
            Câu chuyện & Lời nhắn kỷ niệm <span className="font-normal text-zinc-400 lowercase">(tùy chọn)</span>
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Cảm xúc, lời muốn nói hoặc kỷ niệm đáng nhớ của hai người... (không bắt buộc)"
            className="w-full px-4 py-3 bg-white border border-zinc-300 text-sm text-zinc-900 rounded-none focus:outline-none focus:border-black leading-relaxed"
          />
        </div>
      </div>

      {/* Image Upload Manager */}
      <div className="bg-white border border-zinc-300 p-6 sm:p-8 rounded-none">
        <ImageUploadManager
          memoryId={memoryId}
          existingMedia={existingMedia}
          onMediaChange={refreshMedia}
          onDeleteMedia={handleDeleteMediaOptimistic}
          disabled={isPending}
          pendingFiles={pendingFiles}
          onPendingFilesChange={setPendingFiles}
          pendingLinks={pendingLinks}
          onPendingLinksChange={setPendingLinks}
        />
      </div>

      {/* Visibility Action Bar */}
      <div className="bg-white border border-zinc-300 p-5 flex flex-col md:flex-row items-center justify-between gap-4 rounded-none">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600">Trạng thái:</span>
          <span
            className={`inline-flex items-center px-2.5 py-1 text-xs font-bold uppercase rounded-none border ${visibility === 'published'
              ? 'bg-black text-white border-black'
              : visibility === 'private'
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-zinc-100 text-zinc-800 border-zinc-300'
              }`}
          >
            {visibility === 'published'
              ? 'Xuất bản trên bầu trời 3D'
              : visibility === 'private'
                ? 'Riêng tư'
                : 'Bản nháp'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {isEditMode && memoryId && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleDeleteMemory}
              className="p-2.5 text-red-600 hover:bg-red-50 border border-zinc-300 rounded-none transition-colors"
              title="Xóa kỷ niệm này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSave('draft')}
            className="inline-flex items-center px-4 py-2.5 bg-white border border-zinc-300 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 rounded-none transition-colors disabled:opacity-50"
          >
            <span>Lưu Bản Nháp</span>
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSave('published')}
            className="inline-flex items-center px-6 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 rounded-none transition-colors disabled:opacity-50"
          >
            <span>{isEditMode ? 'Lưu Thay Đổi' : 'Tạo Kỷ Niệm Mới'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
