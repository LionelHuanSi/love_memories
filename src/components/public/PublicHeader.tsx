'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Volume2, VolumeX } from 'lucide-react';
import ShareButton from './ShareButton';

interface PublicHeaderProps {
  publicTitle: string;
  musicUrl?: string | null;
}

export default function PublicHeader({
  publicTitle,
  musicUrl,
}: PublicHeaderProps) {
  const pathname = usePathname();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.volume = 0.2;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const navLinks = [
    { href: '/', label: 'Vũ trụ' },
    { href: '/story', label: 'Dòng thời gian' },
    { href: '/milestones', label: 'Cột mốc' },
  ];

  return (
    <header className="relative z-30 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-between gap-3 sm:gap-4">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 group min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[#232946] border border-[#A78BFA]/30 flex items-center justify-center text-[#A78BFA] group-hover:scale-105 shrink-0 transition-transform shadow-md">
          <Sparkles className="w-4 h-4" />
        </div>
        <span className="font-serif font-bold text-sm sm:text-lg text-[#F8EBDD] tracking-wide group-hover:text-[#A78BFA] transition-colors truncate max-w-[120px] sm:max-w-none">
          {publicTitle}
        </span>
      </Link>


      {/* Nav Links */}
      <nav className="flex items-center gap-1 sm:gap-2">
        <div className="flex items-center p-1 rounded-xl bg-[#121833]/80 border border-[#2C335E]/60 backdrop-blur-md">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive
                    ? 'bg-[#A78BFA] text-[#090E20] font-semibold shadow-sm'
                    : 'text-[#9CA3AF] hover:text-[#F8EBDD]'
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Music Player Button (if musicUrl configured) */}
        {musicUrl && (
          <>
            <audio ref={audioRef} src={musicUrl} loop preload="none" />
            <button
              type="button"
              onClick={toggleMusic}
              className={`p-2 rounded-xl border transition-all ${isPlaying
                  ? 'bg-[#A78BFA]/20 border-[#A78BFA] text-[#A78BFA] animate-pulse'
                  : 'bg-[#121833]/80 border-[#2C335E] text-[#9CA3AF] hover:text-[#F8EBDD]'
                }`}
              title={isPlaying ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
            >
              {isPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </>
        )}

        {/* Share Button */}
        <ShareButton
          title={publicTitle}
          text={`Khám phá vũ trụ kỷ niệm của chúng mình ✨ - ${publicTitle}`}
        />
      </nav>
    </header>
  );
}
