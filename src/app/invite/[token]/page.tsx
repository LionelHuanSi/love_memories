'use client';

import { use, useState, useEffect, useTransition, Suspense } from 'react';
import Link from 'next/link';
import { HeartHandshake, Sparkles, CheckCircle2, AlertCircle, ArrowRight, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function InviteContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [acceptedSuccess, setAcceptedSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser({ id: user.id, email: user.email });
        }
      } catch (err) {
        console.error('Failed to check auth:', err);
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleAcceptInvite = async () => {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/invites/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setMessage({
            type: 'error',
            text: data.error || 'Không thể chấp nhận lời mời. Vui lòng kiểm tra lại.',
          });
        } else {
          setAcceptedSuccess(true);
          setMessage({
            type: 'success',
            text: 'Chúc mừng bạn! Bạn đã chính thức trở thành người đồng hành (Partner) của không gian.',
          });
        }
      } catch (err: unknown) {
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Lỗi kết nối máy chủ',
        });
      }
    });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;

    setMessage(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        if (authMode === 'signup') {
          const { data, error } = await supabase.auth.signUp({
            email: authEmail,
            password: authPassword,
          });
          if (error) {
            setMessage({ type: 'error', text: error.message });
            return;
          }
          if (data.user) {
            setCurrentUser({ id: data.user.id, email: data.user.email });
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password: authPassword,
          });
          if (error) {
            setMessage({ type: 'error', text: error.message });
            return;
          }
          if (data.user) {
            setCurrentUser({ id: data.user.id, email: data.user.email });
          }
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
    <div className="min-h-screen flex items-center justify-center cosmic-radial px-4 py-12">
      <div className="w-full max-w-lg mx-auto">
        <div className="glass-panel-glow rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden text-center">
          {/* Subtle cosmic glow */}
          <div className="absolute -top-20 -left-20 w-44 h-44 bg-[#A78BFA]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-[#F2A7C4]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#232946] border border-[#A78BFA]/30 text-[#F2A7C4] mb-4 shadow-lg shadow-[#F2A7C4]/15">
            <HeartHandshake className="w-8 h-8 animate-bounce" />
          </div>

          <h1 className="text-3xl font-serif font-bold text-[#F8EBDD] mb-2 tracking-wide">
            Lời Mời Đồng Hành
          </h1>
          <p className="text-sm text-[#9CA3AF] max-w-md mx-auto mb-6">
            Người ấy đã gửi tặng bạn chiếc chìa khóa để cùng nhau tạo nên vũ trụ kỷ niệm và chòm sao tình yêu của hai người.
          </p>

          {message && (
            <div
              className={`mb-6 p-4 rounded-xl text-sm flex items-start gap-3 border text-left ${
                message.type === 'error'
                  ? 'bg-red-950/40 border-red-500/30 text-red-200'
                  : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
              }`}
            >
              {message.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {acceptedSuccess ? (
            <div className="space-y-4 py-4">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
                <Sparkles className="w-8 h-8" />
              </div>
              <p className="text-base text-[#F8EBDD] font-medium">
                Chào mừng bạn bước vào không gian chung! Giờ đây cả hai có thể cùng nhau tạo kỷ niệm mới.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/studio"
                  className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-[#A78BFA] to-[#F2A7C4] text-[#090E20] font-semibold rounded-xl text-sm shadow-lg shadow-[#A78BFA]/20 hover:opacity-95 transition-all"
                >
                  <span>Vào Studio Quản lý</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-[#232946] border border-[#2C335E] text-[#F8EBDD] font-medium rounded-xl text-sm hover:border-[#A78BFA]/50 transition-all"
                >
                  Khám phá Bản đồ sao
                </Link>
              </div>
            </div>
          ) : authLoading ? (
            <div className="py-8 text-sm text-[#A78BFA]">Đang kiểm tra thông tin tài khoản...</div>
          ) : currentUser ? (
            <div className="space-y-6 py-2">
              <div className="p-4 bg-[#121833] rounded-2xl border border-[#2C335E] text-left">
                <p className="text-xs text-[#9CA3AF] mb-1">Đang đăng nhập với:</p>
                <p className="text-sm font-semibold text-[#F8EBDD] truncate">{currentUser.email}</p>
              </div>

              <button
                type="button"
                onClick={handleAcceptInvite}
                disabled={isPending}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-[#A78BFA] to-[#F2A7C4] text-[#090E20] font-bold rounded-xl text-base shadow-lg shadow-[#A78BFA]/25 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {isPending ? 'Đang kích hoạt quyền đồng hành...' : 'Chấp nhận lời mời & Gia nhập'}
              </button>
            </div>
          ) : (
            <div className="space-y-6 pt-2 text-left">
              <div className="p-4 bg-[#121833]/90 rounded-2xl border border-[#2C335E]">
                <p className="text-xs text-[#9CA3AF] mb-3">
                  Để chấp nhận lời mời, vui lòng đăng nhập hoặc tạo tài khoản người đồng hành:
                </p>

                <div className="grid grid-cols-2 p-1 bg-[#090E20] rounded-xl mb-4 border border-[#2C335E]">
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                      authMode === 'signup'
                        ? 'bg-[#A78BFA] text-[#090E20] font-semibold'
                        : 'text-[#9CA3AF]'
                    }`}
                  >
                    Tạo tài khoản mới
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                      authMode === 'signin'
                        ? 'bg-[#A78BFA] text-[#090E20] font-semibold'
                        : 'text-[#9CA3AF]'
                    }`}
                  >
                    Đã có tài khoản
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#9CA3AF] mb-1">Email của bạn</label>
                    <input
                      type="email"
                      required
                      placeholder="partner@universe.love"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#090E20] border border-[#2C335E] rounded-xl text-sm text-[#F8EBDD] focus:outline-none focus:border-[#A78BFA]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9CA3AF] mb-1">Mật khẩu</label>
                    <input
                      type="password"
                      required
                      placeholder="Tối thiểu 6 ký tự"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#090E20] border border-[#2C335E] rounded-xl text-sm text-[#F8EBDD] focus:outline-none focus:border-[#A78BFA]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-2.5 px-4 bg-[#A78BFA] text-[#090E20] font-semibold rounded-xl text-sm hover:opacity-95 transition-all disabled:opacity-50"
                  >
                    {isPending
                      ? 'Đang xử lý...'
                      : authMode === 'signup'
                      ? 'Đăng ký tài khoản'
                      : 'Đăng nhập tài khoản'}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-[#2C335E]/60 flex items-center justify-center gap-1.5 text-xs text-[#9CA3AF]">
            <span>Liên kết an toàn dùng 1 lần</span>
            <Heart className="w-3.5 h-3.5 text-[#F2A7C4] fill-[#F2A7C4]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-[#A78BFA]">Đang xác thực liên kết mời...</div>}>
      <InviteContent params={params} />
    </Suspense>
  );
}
