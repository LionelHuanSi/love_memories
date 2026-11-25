'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  className?: string;
}

export default function ShareButton({
  title,
  text = 'Một kỷ niệm đẹp trong dải ngân hà của chúng mình ✨',
  url,
  className = '',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: targetUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Fallback: Clipboard copy
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#121833] border border-[#2C335E] hover:border-[#A78BFA]/50 text-xs font-medium text-[#F8EBDD] transition-all active:scale-95 ${className}`}
      title="Chia sẻ kỷ niệm này"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 font-semibold">Đã chép link</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5 text-[#A78BFA]" />
          <span>Chia sẻ</span>
        </>
      )}
    </button>
  );
}
