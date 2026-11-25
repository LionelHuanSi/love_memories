'use client';

import { useState, useRef, useTransition } from 'react';
import Image from 'next/image';
import {
  Upload,
  X,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  Link2,
  Plus,
} from 'lucide-react';
import type { MemoryMedia } from '@/lib/types/database';

interface UploadingFile {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

let uploadCounter = 0;
function createUploadId(fileName: string): string {
  uploadCounter += 1;
  return `upload-${uploadCounter}-${fileName}`;
}

export interface PendingUploadFile {
  id: string;
  file: File;
  previewUrl: string;
}

export interface PendingUploadLink {
  id: string;
  url: string;
}

interface ImageUploadManagerProps {
  memoryId: string | null;
  existingMedia: MemoryMedia[];
  onMediaChange: () => void;
  onDeleteMedia?: (mediaId: string) => void | Promise<void>;
  disabled?: boolean;
  pendingFiles?: PendingUploadFile[];
  onPendingFilesChange?: (files: PendingUploadFile[]) => void;
  pendingLinks?: PendingUploadLink[];
  onPendingLinksChange?: (links: PendingUploadLink[]) => void;
}

// Convert Google Drive share link to direct renderable link
export function formatDriveOrDirectUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.includes('drive.google.com')) {
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1600`;
    }
  }
  return trimmed;
}

export default function ImageUploadManager({
  memoryId,
  existingMedia,
  onMediaChange,
  onDeleteMedia,
  disabled = false,
  pendingFiles = [],
  onPendingFilesChange,
  pendingLinks = [],
  onPendingLinksChange,
}: ImageUploadManagerProps) {
  const [uploadQueue, setUploadQueue] = useState<UploadingFile[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const totalPhotosCount =
    existingMedia.length +
    uploadQueue.filter((f) => f.status !== 'error').length +
    pendingFiles.length +
    pendingLinks.length;

  const handleFilesSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setGlobalError(null);

    const availableSlots = 30 - totalPhotosCount;
    if (availableSlots <= 0) {
      setGlobalError('Kỷ niệm này đã đạt giới hạn tối đa 30 bức ảnh.');
      return;
    }

    const filesArray = Array.from(files).slice(0, availableSlots);
    if (files.length > availableSlots) {
      setGlobalError(`Chỉ có thể tải thêm tối đa ${availableSlots} bức ảnh.`);
    }

    // Khi tạo mới kỷ niệm (chưa có memoryId), lưu tạm vào pendingFiles để xem trước và lưu cùng lúc
    if (!memoryId) {
      if (onPendingFilesChange) {
        const newPending: PendingUploadFile[] = [];
        for (const file of filesArray) {
          const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
          if (!validTypes.includes(file.type)) {
            setGlobalError(`Ảnh "${file.name}" không hợp lệ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.`);
            continue;
          }
          if (file.size > 25 * 1024 * 1024) {
            setGlobalError(`Ảnh "${file.name}" vượt quá giới hạn 25MB.`);
            continue;
          }
          newPending.push({
            id: createUploadId(file.name),
            file,
            previewUrl: URL.createObjectURL(file),
          });
        }
        onPendingFilesChange([...pendingFiles, ...newPending]);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (files.length > availableSlots) {
      setGlobalError(`Chỉ có thể tải thêm tối đa ${availableSlots} bức ảnh.`);
    }

    for (const file of filesArray) {
      // Validate format
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        if (file.name.toLowerCase().endsWith('.heic')) {
          setGlobalError(`Ảnh "${file.name}" định dạng HEIC. Vui lòng chuyển sang JPG/PNG trước khi tải.`);
        } else {
          setGlobalError(`Ảnh "${file.name}" không hợp lệ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.`);
        }
        continue;
      }

      // Validate size (25MB)
      if (file.size > 25 * 1024 * 1024) {
        setGlobalError(`Ảnh "${file.name}" vượt quá giới hạn 25MB.`);
        continue;
      }

      const fileId = createUploadId(file.name);
      const previewUrl = URL.createObjectURL(file);

      const newUploadItem: UploadingFile = {
        id: fileId,
        file,
        previewUrl,
        progress: 10,
        status: 'uploading',
      };

      setUploadQueue((prev) => [...prev, newUploadItem]);
      uploadSingleFile(newUploadItem);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadSingleFile = async (item: UploadingFile) => {
    if (!memoryId) return;

    try {
      setUploadQueue((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, progress: 30 } : f))
      );

      // Upload file directly to local API
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('memoryId', memoryId);

      const res = await fetch('/api/studio/uploads/file', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi tải ảnh lên');
      }

      setUploadQueue((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, progress: 100, status: 'success' } : f))
      );

      setTimeout(() => {
        setUploadQueue((prev) => prev.filter((f) => f.id !== item.id));
        onMediaChange();
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tải lên thất bại';
      setUploadQueue((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: 'error', errorMessage: msg } : f
        )
      );
    }
  };

  const handleAddLink = async () => {
    if (!linkInput.trim()) return;
    setGlobalError(null);

    const directUrl = formatDriveOrDirectUrl(linkInput);

    // Khi tạo mới kỷ niệm (chưa có memoryId), lưu tạm vào pendingLinks
    if (!memoryId) {
      if (onPendingLinksChange) {
        onPendingLinksChange([
          ...pendingLinks,
          { id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, url: directUrl },
        ]);
        setLinkInput('');
      }
      return;
    }

    setIsAddingLink(true);
    try {
      const res = await fetch(`/api/studio/memories/${memoryId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_path: directUrl,
          thumbnail_path: directUrl,
          mime_type: 'image/jpeg',
          file_size_bytes: 102400,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi thêm link ảnh');
      }

      setLinkInput('');
      onMediaChange();
    } catch (e: unknown) {
      setGlobalError(e instanceof Error ? e.message : 'Không thể thêm link ảnh');
    } finally {
      setIsAddingLink(false);
    }
  };

  const handleRemoveQueueItem = (id: string) => {
    setUploadQueue((prev) => prev.filter((f) => f.id !== id));
  };

  const executeDelete = async (mediaId: string) => {
    setConfirmingDeleteId(null);
    if (onDeleteMedia) {
      await onDeleteMedia(mediaId);
      return;
    }
    try {
      const res = await fetch(`/api/studio/memories/${memoryId}/media?mediaId=${mediaId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onMediaChange();
      } else {
        const data = await res.json().catch(() => ({}));
        setGlobalError(data.error || 'Lỗi khi xóa ảnh');
      }
    } catch {
      setGlobalError('Lỗi kết nối khi xóa ảnh');
    }
  };

  const handleMoveMedia = async (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= existingMedia.length) return;

    const newMedia = [...existingMedia];
    const [moved] = newMedia.splice(index, 1);
    newMedia.splice(targetIndex, 0, moved);

    const mediaIds = newMedia.map((m) => m.id);

    startTransition(async () => {
      try {
        await fetch(`/api/studio/memories/${memoryId}/media`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaIds }),
        });
        onMediaChange();
      } catch {
        setGlobalError('Lỗi cập nhật thứ tự ảnh');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-3 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-zinc-900" />
            <span>Hình ảnh kỷ niệm ({totalPhotosCount}/30)</span>
          </h4>
          <p className="text-xs text-zinc-500 mt-0.5">
            Tải ảnh từ máy tính/điện thoại hoặc chèn link Google Drive trực tiếp.
          </p>
        </div>
      </div>

      {globalError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 rounded-none">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Grid: Upload từ máy & Dán link Google Drive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box 1: Tải tệp từ thiết bị */}
        <div
          onClick={() => !disabled && totalPhotosCount < 30 && fileInputRef.current?.click()}
          className={`border-2 border-dashed p-6 text-center transition-all rounded-none ${
            disabled || totalPhotosCount >= 30
              ? 'border-zinc-200 bg-zinc-50 cursor-not-allowed opacity-60'
              : 'border-zinc-300 hover:border-black bg-zinc-50 hover:bg-zinc-100 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={disabled || totalPhotosCount >= 30}
            onChange={(e) => handleFilesSelect(e.target.files)}
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 border border-zinc-300 bg-white flex items-center justify-center text-zinc-800">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
                {totalPhotosCount >= 30
                  ? 'Đã đạt tối đa 30 ảnh'
                  : '1. Tải ảnh từ máy tính / điện thoại'}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                JPG, PNG, WebP — Lưu trữ trực tiếp không bị lỗi
              </p>
            </div>
          </div>
        </div>

        {/* Box 2: Dán link Google Drive / Link ảnh ngoài */}
        <div className="border border-zinc-300 bg-white p-5 rounded-none flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-900 mb-1">
              <Link2 className="w-4 h-4 text-zinc-800" />
              <span>2. Thêm bằng Link Google Drive / URL ảnh</span>
            </div>
            <p className="text-[11px] text-zinc-500 mb-3">
              Dán link chia sẻ Google Drive (chọn quyền <i>&quot;Bất kỳ ai có đường liên kết đều xem được&quot;</i>) hoặc link ảnh trực tiếp.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://drive.google.com/file/d/... hoặc link ảnh"
                disabled={disabled || isAddingLink || totalPhotosCount >= 30}
                className="flex-1 px-3 py-2 border border-zinc-300 text-xs text-zinc-900 rounded-none focus:outline-none focus:border-black"
              />
              <button
                type="button"
                onClick={handleAddLink}
                disabled={disabled || !linkInput.trim() || isAddingLink || totalPhotosCount >= 30}
                className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-none hover:bg-zinc-800 disabled:opacity-30 flex items-center gap-1 transition-colors"
              >
                {isAddingLink ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Thêm</span>
              </button>
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 mt-2">
            Hệ thống sẽ tự động chuyển link Drive sang ảnh phân giải cao hiển thị mượt mà.
          </p>
        </div>
      </div>

      {/* Pending Media Gallery (Khi tạo mới kỷ niệm) */}
      {!memoryId && (pendingFiles.length > 0 || pendingLinks.length > 0) && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <span>Ảnh đã chọn ({pendingFiles.length + pendingLinks.length}) — Sẽ được lưu cùng kỷ niệm khi tạo:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pendingFiles.map((item, index) => (
              <div
                key={item.id}
                className="group relative border border-zinc-300 bg-zinc-50 aspect-square flex flex-col justify-between rounded-none overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-0 inset-x-0 p-2 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
                  <span className="px-1.5 py-0.5 bg-black text-white text-[10px] font-mono font-bold rounded-none">
                    #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(item.previewUrl);
                      onPendingFilesChange?.(pendingFiles.filter((f) => f.id !== item.id));
                    }}
                    className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-none transition-colors"
                    title="Bỏ ảnh này"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {pendingLinks.map((item, index) => (
              <div
                key={item.id}
                className="group relative border border-zinc-300 bg-zinc-50 aspect-square flex flex-col justify-between rounded-none overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt="Ảnh từ link"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/fallback-photo.jpg';
                  }}
                />
                <div className="absolute top-0 inset-x-0 p-2 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
                  <span className="px-1.5 py-0.5 bg-violet-700 text-white text-[10px] font-mono font-bold rounded-none">
                    #{pendingFiles.length + index + 1} Link
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onPendingLinksChange?.(pendingLinks.filter((l) => l.id !== item.id));
                    }}
                    className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-none transition-colors"
                    title="Bỏ ảnh này"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploading Queue */}
      {uploadQueue.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-zinc-700 uppercase">Đang tải lên ({uploadQueue.length}):</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className="p-2 border border-zinc-200 bg-white flex items-center gap-3 rounded-none"
              >
                <div className="w-12 h-12 bg-zinc-100 relative shrink-0 overflow-hidden border border-zinc-200">
                  <Image
                    src={item.previewUrl}
                    alt="Upload preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-900 truncate font-medium">{item.file.name}</p>
                  <div className="w-full bg-zinc-200 h-1.5 mt-1">
                    <div
                      className="bg-black h-1.5 transition-all duration-200"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveQueueItem(item.id)}
                  className="p-1 text-zinc-400 hover:text-black"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Media Gallery & Reordering */}
      {existingMedia.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <span>Danh sách ảnh đã lưu ({existingMedia.length}) — Bấm mũi tên để đổi thứ tự hiển thị:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {existingMedia.map((media, index) => {
              const displaySrc =
                media.storage_path?.startsWith('http') ||
                media.storage_path?.startsWith('/') ||
                media.storage_path?.startsWith('data:')
                  ? media.storage_path
                  : `/api/media/${media.id}?thumb=1`;

              return (
                <div
                  key={media.id}
                  className="group relative border border-zinc-300 bg-zinc-50 aspect-square flex flex-col justify-between rounded-none overflow-hidden"
                >
                  {/* Media Image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displaySrc}
                    alt="Ảnh kỷ niệm"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/fallback-photo.jpg';
                    }}
                  />

                  {/* Confirm Delete Inline Overlay */}
                  {confirmingDeleteId === media.id && (
                    <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-3 text-center z-10">
                      <p className="text-white text-xs font-bold mb-2">Xóa bức ảnh này?</p>
                      <div className="flex gap-2 w-full max-w-[140px]">
                        <button
                          type="button"
                          onClick={() => executeDelete(media.id)}
                          className="flex-1 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold uppercase rounded-none transition-colors"
                        >
                          Xóa
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(null)}
                          className="flex-1 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-[11px] font-medium rounded-none transition-colors"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Top overlay badge: Sort Order */}
                  <div className="absolute top-0 inset-x-0 p-2 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
                    <span className="px-1.5 py-0.5 bg-black text-white text-[10px] font-mono font-bold rounded-none">
                      #{index + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteId(media.id)}
                      className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-none transition-colors"
                      title="Xóa ảnh"
                      aria-label="Xóa bức ảnh này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom reorder bar */}
                  <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/75 to-transparent flex items-center justify-between">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveMedia(index, 'left')}
                      className="p-1.5 bg-white text-black hover:bg-zinc-200 disabled:opacity-20 rounded-none transition-colors text-xs"
                      title="Chuyển sang trái"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={index === existingMedia.length - 1}
                      onClick={() => handleMoveMedia(index, 'right')}
                      className="p-1.5 bg-white text-black hover:bg-zinc-200 disabled:opacity-20 rounded-none transition-colors text-xs"
                      title="Chuyển sang phải"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
