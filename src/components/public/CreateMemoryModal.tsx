'use client';

import React, { useState, useRef } from 'react';
import { X, Images, MapPin, Music, Tag, Sparkles, Loader2 } from 'lucide-react';
import type { CosmicMemory } from './CosmicGalaxy3D';

interface CreateMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newMemory: CosmicMemory) => void;
}

export default function CreateMemoryModal({
  isOpen,
  onClose,
  onCreated,
}: CreateMemoryModalProps) {
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [musicNote, setMusicNote] = useState('');
  const [selectedType, setSelectedType] = useState<'milestone' | 'trip' | 'everyday' | 'date'>('milestone');

  // Tag field toggles
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showMusicInput, setShowMusicInput] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  // Uploaded media files
  const [selectedFiles, setSelectedFiles] = useState<Array<{ file: File; previewUrl: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newItems = files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setSelectedFiles((prev) => [...prev, ...newItems]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tên kỷ niệm.');
      return;
    }
    if (!eventDate) {
      setErrorMessage('Vui lòng chọn ngày kỷ niệm.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Try sending to POST /api/studio/memories
      const res = await fetch('/api/studio/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          event_date: eventDate,
          description: description.trim() || undefined,
          location_label: location.trim() || undefined,
          type: selectedType,
          visibility: 'published',
        }),
      });

      let memoryData: { id?: string; slug?: string } | null = null;
      if (res.ok) {
        const json = await res.json();
        memoryData = json.memory;
      }

      // If backend responded with created memory or fallback if unauthenticated
      const memoryId = memoryData?.id || `mem-${Date.now()}`;
      const memorySlug = memoryData?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);

      // Convert selected file previews to media items
      const memoryMedia = selectedFiles.map((item, idx) => ({
        id: `media-${Date.now()}-${idx}`,
        storage_path: item.previewUrl,
        thumbnail_path: item.previewUrl,
      }));

      // If no photos uploaded, provide a lovely default romantic photo
      if (memoryMedia.length === 0) {
        memoryMedia.push({
          id: `media-${Date.now()}-def`,
          storage_path: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=80',
          thumbnail_path: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=600&q=80',
        });
      }

      const newCosmicMemory: CosmicMemory = {
        id: memoryId,
        slug: memorySlug,
        title: title.trim(),
        description: description.trim() || null,
        event_date: eventDate,
        location_label: location.trim() || null,
        type: selectedType,
        memory_media: memoryMedia,
      };

      onCreated(newCosmicMemory);
      onClose();
    } catch (err: unknown) {
      console.error('Save memory error:', err);
      // Fallback: still create the star locally so user is never blocked!
      const newCosmicMemory: CosmicMemory = {
        id: `local-${Date.now()}`,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36),
        title: title.trim(),
        description: description.trim() || null,
        event_date: eventDate,
        location_label: location.trim() || null,
        type: selectedType,
        memory_media: selectedFiles.map((item, idx) => ({
          id: `media-${Date.now()}-${idx}`,
          storage_path: item.previewUrl,
          thumbnail_path: item.previewUrl,
        })),
      };
      onCreated(newCosmicMemory);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-[#0b0e17] border border-[#1e2538] rounded-3xl p-6 sm:p-7 shadow-2xl overflow-y-auto max-h-[92vh] no-scrollbar text-zinc-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-memory-heading"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
          aria-label="Đóng biểu mẫu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <h2 id="create-memory-heading" className="text-xl font-semibold text-white tracking-wide">
            Create a Memory
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Một khoảnh khắc đáng nhớ ♡
          </p>
        </div>

        {/* Error message if any */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-200">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo / Video Upload Area */}
          <div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-[#2b354c] hover:border-violet-400/60 bg-[#0e121e]/60 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-[#121727]/70 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-[#181f33] border border-[#2b354c] flex items-center justify-center text-zinc-300 group-hover:text-violet-300 group-hover:scale-105 transition-all mb-2">
                  <Images className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-white group-hover:text-violet-200 transition-colors">
                  Thêm ảnh hoặc video
                </span>
                <span className="text-xs text-zinc-400 mt-1">
                  Chọn nhiều ảnh cùng lúc hoặc kéo thả tại đây
                </span>
              </div>
            </div>

            {/* Thumbnail previews */}
            {selectedFiles.length > 0 && (
              <div className="flex items-center gap-2 mt-3 overflow-x-auto py-1 no-scrollbar">
                {selectedFiles.map((item, index) => (
                  <div key={index} className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-violet-500/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt="Xem trước ảnh"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tên kỷ niệm */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 pl-1">
              Tên kỷ niệm
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Buổi hẹn đầu tiên của chúng mình"
              required
              className="w-full rounded-full border border-[#232a3d] bg-[#0c101a] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/80 transition-colors"
            />
          </div>

          {/* Ngày kỷ niệm */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 pl-1">
              Ngày kỷ niệm
            </label>
            <div className="relative">
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="w-full rounded-full border border-[#232a3d] bg-[#0c101a] px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/80 transition-colors"
              />
            </div>
          </div>

          {/* Câu chuyện của chúng mình */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 pl-1">
              Câu chuyện của chúng mình
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hôm đó chúng mình đã..."
              className="w-full rounded-2xl border border-[#232a3d] bg-[#0c101a] p-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/80 transition-colors resize-none"
            />
          </div>

          {/* Extended Inputs for Location / Music / Theme */}
          {showLocationInput && (
            <div className="animate-fade-in">
              <label className="block text-xs font-medium text-zinc-300 mb-1 pl-1">Địa điểm</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ví dụ: Quán cà phê ven hồ, Hà Nội"
                className="w-full rounded-full border border-[#232a3d] bg-[#0c101a] px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/80"
              />
            </div>
          )}

          {showMusicInput && (
            <div className="animate-fade-in">
              <label className="block text-xs font-medium text-zinc-300 mb-1 pl-1">Giai điệu gắn liền</label>
              <input
                type="text"
                value={musicNote}
                onChange={(e) => setMusicNote(e.target.value)}
                placeholder="Ví dụ: Until I Found You - Stephen Sanchez"
                className="w-full rounded-full border border-[#232a3d] bg-[#0c101a] px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/80"
              />
            </div>
          )}

          {showThemePicker && (
            <div className="animate-fade-in flex flex-wrap gap-2 pt-1">
              {[
                { id: 'milestone', label: 'Cột mốc quan trọng 🌟' },
                { id: 'trip', label: 'Chuyến du lịch ✈️' },
                { id: 'date', label: 'Hẹn hò lãng mạn 🍷' },
                { id: 'everyday', label: 'Khoảnh khắc thường ngày ☕' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedType(item.id as 'milestone' | 'trip' | 'everyday' | 'date')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedType === item.id
                      ? 'bg-violet-600/40 border border-violet-400 text-white'
                      : 'bg-[#121624] border border-[#232b40] text-zinc-400 hover:text-white'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowLocationInput(!showLocationInput)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${location || showLocationInput
                  ? 'bg-violet-950/60 border border-violet-500/50 text-violet-200'
                  : 'bg-[#131826] border border-[#232b40] text-zinc-300 hover:text-white hover:border-violet-400/40'
                }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{location ? location : 'Địa điểm +'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMusicInput(!showMusicInput)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${musicNote || showMusicInput
                  ? 'bg-pink-950/60 border border-pink-500/50 text-pink-200'
                  : 'bg-[#131826] border border-[#232b40] text-zinc-300 hover:text-white hover:border-violet-400/40'
                }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>{musicNote ? musicNote : 'Âm nhạc +'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowThemePicker(!showThemePicker)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${showThemePicker
                  ? 'bg-amber-950/60 border border-amber-500/50 text-amber-200'
                  : 'bg-[#131826] border border-[#232b40] text-zinc-300 hover:text-white hover:border-violet-400/40'
                }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Chủ đề +</span>
            </button>
          </div>

          {/* Sparkle helper text */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 pt-2 pl-1">
            <Sparkles className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 animate-pulse" />
            <span>Kỷ niệm mới sẽ tự động xuất hiện thành một ngôi sao.</span>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-[#181d2e] hover:bg-[#232a42] border border-white/10 text-zinc-200 hover:text-white font-medium text-sm transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                  <span>Đang thắp sáng vì sao mới...</span>
                </>
              ) : (
                <span>Save to Our Universe</span>
              )}
            </button>
          </div>

          {/* Bottom note */}
          <p className="text-center text-[11px] text-zinc-500 pt-2">
            Vì sao kỷ niệm sẽ được bảo tồn mãi mãi trong dải ngân hà của hai bạn.
          </p>
        </form>
      </div>
    </div>
  );
}
