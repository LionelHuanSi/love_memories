'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { Save, CheckCircle2, AlertCircle, Upload, Play, Square, Loader2 } from 'lucide-react';
import type { Space } from '@/lib/types/database';

export default function StudioSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [publicTitle, setPublicTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [relationshipStartDate, setRelationshipStartDate] = useState('');
  const [showDayCounter, setShowDayCounter] = useState(false);
  const [accentColor, setAccentColor] = useState('#000000');
  const [musicUrl, setMusicUrl] = useState('');

  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadSettings() {
      try {
        const res = await fetch('/api/studio/settings');
        const data = await res.json();
        if (!ignore && res.ok && data.space) {
          const s = data.space as Space;
          setPublicTitle(s.public_title || 'Our Little Universe');
          setTagline(s.tagline || '');
          setRelationshipStartDate(s.relationship_start_date || '');
          setShowDayCounter(!!s.show_day_counter);
          setAccentColor(s.theme?.accentColor || '#000000');
          setMusicUrl(s.theme?.musicUrl || '');
        }
      } catch {
        if (!ignore) {
          setMessage({ type: 'error', text: 'Không thể tải cài đặt không gian' });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadSettings();
    return () => {
      ignore = true;
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, []);

  const handleTogglePreview = () => {
    if (!musicUrl) return;
    if (isPlayingPreview) {
      audioPreviewRef.current?.pause();
      setIsPlayingPreview(false);
    } else {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio();
      }
      let resolved = musicUrl.trim();
      if (resolved.includes('drive.google.com')) {
        const match = resolved.match(/\/d\/([a-zA-Z0-9_-]+)/) || resolved.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          resolved = `https://drive.google.com/uc?export=download&id=${match[1]}`;
        }
      }
      audioPreviewRef.current.src = resolved;
      audioPreviewRef.current.play()
        .then(() => setIsPlayingPreview(true))
        .catch(() => {
          setIsPlayingPreview(false);
          setMessage({ type: 'error', text: 'Không thể phát thử link nhạc này. Vui lòng kiểm tra lại link hoặc tải file MP3 trực tiếp.' });
        });
      audioPreviewRef.current.onended = () => setIsPlayingPreview(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAudio(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/studio/uploads/audio', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi tải file nhạc');
      }
      setMusicUrl(data.url);
      setMessage({ type: 'success', text: `Đã tải lên bài hát: ${data.filename}` });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Lỗi tải nhạc' });
    } finally {
      setIsUploadingAudio(false);
      if (audioFileInputRef.current) audioFileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/studio/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_title: publicTitle,
            tagline: tagline || null,
            relationship_start_date: relationshipStartDate || null,
            show_day_counter: showDayCounter,
            accentColor,
            musicUrl: musicUrl || null,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setMessage({ type: 'success', text: 'Cài đặt không gian đã được lưu thành công!' });
        } else {
          setMessage({ type: 'error', text: data.error || 'Lỗi khi lưu cài đặt' });
        }
      } catch {
        setMessage({ type: 'error', text: 'Lỗi mạng khi cập nhật cài đặt' });
      }
    });
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-zinc-500">Đang tải cài đặt không gian...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-serif font-bold text-zinc-900">Cài Đặt Không Gian</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Tùy chỉnh tiêu đề hiển thị, ngày kỷ niệm bắt đầu tình yêu và các thông số hiển thị.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-none text-xs flex items-start gap-3 border ${
            message.type === 'error'
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

      <form onSubmit={handleSubmit} noValidate className="bg-white border border-zinc-300 p-6 sm:p-8 space-y-6 rounded-none">
        <div>
          <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">
            Tiêu đề công khai
          </label>
          <input
            type="text"
            required
            value={publicTitle}
            onChange={(e) => setPublicTitle(e.target.value)}
            placeholder="Our Little Universe"
            className="w-full px-4 py-2.5 bg-white border border-zinc-300 rounded-none text-sm text-zinc-900 focus:outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">
            Tagline
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="A constellation of our unforgettable moments"
            className="w-full px-4 py-2.5 bg-white border border-zinc-300 rounded-none text-sm text-zinc-900 focus:outline-none focus:border-black"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">
              Ngày bắt đầu yêu
            </label>
            <input
              type="date"
              value={relationshipStartDate}
              onChange={(e) => setRelationshipStartDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-zinc-300 rounded-none text-sm text-zinc-900 focus:outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">
              Theme Accent
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-10 h-10 cursor-pointer bg-white border border-zinc-300 rounded-none"
              />
              <span className="text-xs font-mono text-zinc-700">{accentColor}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-50 border border-zinc-300 rounded-none flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-zinc-900">Hiển thị bộ đếm ngày bên nhau</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showDayCounter}
              onChange={(e) => setShowDayCounter(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
          </label>
        </div>

        {/* Music section with MP3 upload and Preview Player */}
        <div>
          <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">
            Nhạc nền
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={musicUrl}
              onChange={(e) => {
                setMusicUrl(e.target.value);
                if (isPlayingPreview) {
                  audioPreviewRef.current?.pause();
                  setIsPlayingPreview(false);
                }
              }}
              placeholder="Dán link nhạc (.mp3, Google Drive...) hoặc bấm nút Tải MP3"
              className="flex-1 px-4 py-2.5 bg-white border border-zinc-300 rounded-none text-sm text-zinc-900 focus:outline-none focus:border-black"
            />

            <div className="flex items-center gap-2">
              <input
                ref={audioFileInputRef}
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.ogg"
                className="hidden"
                onChange={handleAudioUpload}
              />
              <button
                type="button"
                onClick={() => audioFileInputRef.current?.click()}
                disabled={isUploadingAudio}
                className="px-3.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-xs font-bold uppercase tracking-wider rounded-none text-zinc-800 flex items-center gap-1.5 transition-colors shrink-0"
                title="Tải file nhạc trực tiếp từ máy tính/điện thoại"
              >
                {isUploadingAudio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isUploadingAudio ? 'Đang tải...' : 'Tải MP3'}</span>
              </button>

              {musicUrl && (
                <button
                  type="button"
                  onClick={handleTogglePreview}
                  className="px-3.5 py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-none flex items-center gap-1.5 transition-colors shrink-0"
                  title="Nghe thử bài hát"
                >
                  {isPlayingPreview ? <Square className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white" />}
                  <span>{isPlayingPreview ? 'Dừng' : 'Nghe thử'}</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5">
            Bấm <strong>Tải MP3</strong> để chọn file bài hát từ thiết bị, hoặc dán link Google Drive / link MP3 trực tiếp.
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-black text-white font-bold rounded-none text-xs uppercase tracking-wider hover:bg-zinc-800 transition-colors border border-black disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isPending ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
