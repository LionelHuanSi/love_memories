'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import type { MemoryMedia } from '@/lib/types/database';

interface LightboxGalleryProps {
  media: MemoryMedia[];
  memoryTitle: string;
}

export default function LightboxGallery({ media, memoryTitle }: LightboxGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const isOpen = activeIndex !== null;
  const currentPhoto = activeIndex !== null ? media[activeIndex] : null;

  const handleNext = useCallback(() => {
    if (activeIndex === null) return;
    setActiveIndex((prev) => (prev! + 1) % media.length);
  }, [activeIndex, media.length]);

  const handlePrev = useCallback(() => {
    if (activeIndex === null) return;
    setActiveIndex((prev) => (prev! - 1 + media.length) % media.length);
  }, [activeIndex, media.length]);

  const handleClose = useCallback(() => {
    setActiveIndex(null);
  }, []);

  // Lock body scroll when Lightbox is open on mobile and desktop
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose, handleNext, handlePrev]);

  // Touch swipe support for mobile (Swipe Left/Right for photos, Swipe Down to dismiss)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchStartX - touchEndX;
    const diffY = touchEndY - touchStartY; // positive when swiping downward

    // Natural mobile gesture: swipe down to dismiss
    if (diffY > 80 && Math.abs(diffX) < 80) {
      handleClose();
    } else if (diffX > 45) {
      handleNext(); // Swiped left -> next
    } else if (diffX < -45) {
      handlePrev(); // Swiped right -> prev
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  if (!media || media.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {media.map((item, index) => (
          <div
            key={item.id}
            onClick={() => setActiveIndex(index)}
            className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border border-[#2C335E]/60 bg-[#121833] shadow-md transition-all duration-300 hover:border-[#A78BFA]/60 hover:shadow-[#A78BFA]/10 active:scale-95"
            role="button"
            tabIndex={0}
            aria-label={`Xem ảnh ${index + 1} của ${memoryTitle}`}
          >
            <Image
              src={`/api/media/${item.id}?thumb=1`}
              alt={item.alt_text || `${memoryTitle} - ảnh ${index + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090E20]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2.5">
              <span className="p-1.5 rounded-lg bg-[#090E20]/80 text-[#F8EBDD] backdrop-blur-md">
                <Maximize2 className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isOpen && currentPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#090E20]/95 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-8 animate-in fade-in duration-200 select-none touch-manipulation"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Bar with safe-area spacing */}
          <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-auto">
            <span className="px-3.5 py-1.5 rounded-full bg-[#121833]/90 border border-[#2C335E] text-xs font-mono text-[#F8EBDD] backdrop-blur-md shadow-md">
              {activeIndex + 1} / {media.length}
            </span>

            <button
              type="button"
              onClick={handleClose}
              className="p-2.5 rounded-full bg-[#121833]/90 hover:bg-[#232946] active:bg-[#A78BFA] active:text-[#090E20] border border-[#2C335E] text-[#F8EBDD] transition-colors shadow-lg"
              title="Đóng thư viện (Esc hoặc vuốt xuống)"
              aria-label="Đóng thư viện ảnh"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Controls (Desktop & Tablet) */}
          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-[#121833]/90 hover:bg-[#232946] active:bg-[#A78BFA] active:text-[#090E20] border border-[#2C335E] text-[#F8EBDD] backdrop-blur-md transition-colors"
                title="Ảnh trước (Mũi tên trái)"
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-[#121833]/90 hover:bg-[#232946] active:bg-[#A78BFA] active:text-[#090E20] border border-[#2C335E] text-[#F8EBDD] backdrop-blur-md transition-colors"
                title="Ảnh kế tiếp (Mũi tên phải)"
                aria-label="Ảnh kế tiếp"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Main Full-Screen Photo Container */}
          <div
            className="relative w-full h-full max-w-5xl max-h-[82vh] sm:max-h-[85vh] flex items-center justify-center select-none"
            onClick={(e) => {
              // Click outside photo to close
              if (e.target === e.currentTarget) handleClose();
            }}
          >
            <Image
              src={`/api/media/${currentPhoto.id}`}
              alt={currentPhoto.alt_text || `${memoryTitle} - ảnh ${activeIndex + 1}`}
              fill
              className="object-contain pointer-events-none"
              priority
              unoptimized
            />
          </div>

          {/* Mobile swipe helper pill at bottom */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none sm:hidden">
            <span className="px-3 py-1 rounded-full bg-[#121833]/80 border border-[#2C335E] text-[10px] text-[#9CA3AF] backdrop-blur-md">
              Vuốt sang để chuyển ảnh • Vuốt xuống để đóng
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

