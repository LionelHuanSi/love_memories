'use client';

import { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/studio';
  const urlError = searchParams.get('error');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    urlError === 'unauthorized_account'
      ? {
          type: 'error',
          text: 'Tài khoản chưa được cấp quyền quản trị không gian này.',
        }
      : null
  );
  const [isPending, startTransition] = useTransition();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setMessage(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const loginEmail = username.trim().includes('@')
          ? username.trim()
          : `${username.trim()}@universe.love`;
        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });

        if (error) {
          setMessage({
            type: 'error',
            text: error.message || 'Tài khoản hoặc mật khẩu không chính xác',
          });
        } else {
          router.push(redirectPath);
          router.refresh();
        }
      } catch (err: unknown) {
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Đã có lỗi xảy ra',
        });
      }
    });
  };

  return (
    <div className="w-full max-w-sm mx-auto p-4 sm:p-0">
      {/* Top back link */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-600 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại bầu trời sao</span>
        </Link>
      </div>

      {/* Main Square Login Frame (Black & White Minimalist) */}
      <div className="bg-white border-2 border-black rounded-none p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 border border-black bg-black text-white flex items-center justify-center mx-auto mb-3 rounded-none">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-serif font-bold text-xl sm:text-2xl text-black tracking-tight">
            Đăng Nhập Studio
          </h1>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-medium">
            Quản trị không gian kỷ niệm
          </p>
        </div>

        {/* Error notification */}
        {message && (
          <div className="mb-5 p-3 rounded-none bg-zinc-100 border-l-4 border-black text-xs text-zinc-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-black shrink-0 mt-0.5" />
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Minimalist form: only tk and mk */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-[11px] font-bold uppercase tracking-wider text-zinc-800 mb-1.5"
            >
              Tài khoản
            </label>
            <input
              id="username"
              type="text"
              required
              autoComplete="username"
              placeholder="Nhập tên tài khoản"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-zinc-400 focus:border-black rounded-none text-sm text-black placeholder-zinc-400 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[11px] font-bold uppercase tracking-wider text-zinc-800 mb-1.5"
            >
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-zinc-400 focus:border-black rounded-none text-sm text-black placeholder-zinc-400 focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 px-4 bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-widest rounded-none border border-black shadow-none transition-all disabled:opacity-50 mt-2 active:translate-y-0.5"
          >
            {isPending ? 'Đang xác thực...' : 'ĐĂNG NHẬP'}
          </button>
        </form>


      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs uppercase tracking-widest text-zinc-500">Đang tải...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
