'use client';

import { useState, useEffect, useTransition } from 'react';
import { UserPlus, Copy, Check, Clock, ShieldCheck, AlertCircle, Heart } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface InviteItem {
  id: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export default function StudioInvitationsPage() {
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshInvites = async () => {
    try {
      const res = await fetch('/api/studio/invites');
      const data = await res.json();
      if (res.ok && data.invites) {
        setInvites(data.invites);
      }
    } catch {
      // Ignored during background refresh
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/studio/invites');
        const data = await res.json();
        if (!ignore) {
          if (res.ok && data.invites) {
            setInvites(data.invites);
          } else if (!res.ok) {
            setError(data.error || 'Không thể tải danh sách lời mời');
          }
        }
      } catch {
        if (!ignore) {
          setError('Lỗi kết nối khi tải danh sách lời mời');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleCreateInvite = () => {
    setError(null);
    setNewInviteUrl(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/studio/invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiresInDays: 7 }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.invite) {
          setNewInviteUrl(data.invite.inviteUrl);
          refreshInvites();
        } else {
          setError(data.error || 'Không thể tạo lời mời');
        }
      } catch {
        setError('Lỗi khi gửi yêu cầu tạo lời mời');
      }
    });
  };

  const handleCopyLink = () => {
    if (!newInviteUrl) return;
    navigator.clipboard.writeText(newInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-serif font-bold text-zinc-900">Mời Người Đồng Hành</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Chỉ có duy nhất 1 người đồng hành (Partner) có thể tham gia để cùng bạn quản lý không gian này.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-300 text-red-800 text-xs flex items-start gap-3 rounded-none">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Box: White square design */}
      <div className="bg-white border border-zinc-300 p-6 sm:p-8 rounded-none">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-zinc-300 bg-zinc-50 flex items-center justify-center text-zinc-900 rounded-none">
              <Heart className="w-5 h-5 text-zinc-800 fill-zinc-200" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
                Tạo liên kết mời bí mật
              </h3>
              <p className="text-xs text-zinc-500">
                Liên kết dùng 1 lần, có hiệu lực trong 7 ngày
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateInvite}
            disabled={isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white font-bold text-xs uppercase tracking-wider rounded-none hover:bg-zinc-800 transition-colors border border-black disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isPending ? 'Đang tạo link...' : 'Tạo link mời mới'}</span>
          </button>
        </div>

        {newInviteUrl && (
          <div className="mt-4 p-4 bg-zinc-50 border border-zinc-300 space-y-3 rounded-none">
            <p className="text-xs font-bold text-zinc-900 flex items-center gap-1.5 uppercase">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Link mời đã sẵn sàng! Gửi link này cho người ấy:</span>
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={newInviteUrl}
                className="w-full px-3.5 py-2 bg-white border border-zinc-300 rounded-none text-xs text-zinc-900 font-mono select-all focus:outline-none focus:border-black"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-none text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 shrink-0 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">
              * Khi người ấy đăng nhập và bấm chấp nhận, mã này sẽ tự động đóng lại để bảo mật.
            </p>
          </div>
        )}
      </div>

      {/* History of Invites */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
          Lịch sử các mã mời đã tạo
        </h3>

        {loading ? (
          <div className="py-6 text-xs text-zinc-500">Đang tải lịch sử...</div>
        ) : invites.length === 0 ? (
          <div className="p-6 bg-white border border-zinc-300 text-center text-xs text-zinc-500 rounded-none">
            Chưa có mã mời nào được tạo trước đây.
          </div>
        ) : (
          <div className="space-y-2">
            {invites.map((invite) => {
              const isUsed = !!invite.used_at;
              const isRevoked = !!invite.revoked_at;
              const isExpired = new Date(invite.expires_at) < new Date();

              return (
                <div
                  key={invite.id}
                  className="bg-white p-4 border border-zinc-300 rounded-none flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-zinc-600" />
                      <span className="text-xs font-medium text-zinc-900">
                        Tạo ngày {formatDate(invite.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Hết hạn vào: {formatDate(invite.expires_at)}
                    </p>
                  </div>

                  <div>
                    {isUsed ? (
                      <span className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-none bg-emerald-50 text-emerald-800 border border-emerald-300">
                        Đã tham gia
                      </span>
                    ) : isRevoked ? (
                      <span className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-none bg-red-50 text-red-800 border border-red-300">
                        Đã thu hồi
                      </span>
                    ) : isExpired ? (
                      <span className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-none bg-zinc-100 text-zinc-600 border border-zinc-300">
                        Đã hết hạn
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-none bg-amber-50 text-amber-800 border border-amber-300">
                        Đang chờ chấp nhận
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
