import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Settings, Eye, LogOut, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/studio');
  }

  const defaultSlug = process.env.DEFAULT_SPACE_SLUG || 'our-universe';

  const { data: space } = await supabase
    .from('spaces')
    .select('id, public_title, slug')
    .eq('slug', defaultSlug)
    .maybeSingle();

  const isOwner = true;
  const spaceTitle = space?.public_title || 'Our Little Universe';

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 flex flex-col font-sans">
      {/* Studio Header: Minimalist White, Square Borders */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/studio" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 border border-zinc-900 bg-black flex items-center justify-center text-white rounded-none">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-serif font-bold text-base text-zinc-900 tracking-wide block leading-none">
                  {spaceTitle}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5 block">
                  Studio • {isOwner ? 'Quản trị' : 'Thành viên'}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-3">
            <Link
              href="/studio"
              className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-900 hover:bg-zinc-100 rounded-none transition-colors border border-transparent hover:border-zinc-300"
            >
              Danh sách kỷ niệm
            </Link>
            <Link
              href="/studio/settings"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 hover:text-black rounded-none hover:bg-zinc-100 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Cài đặt
            </Link>
            <div className="h-4 w-[1px] bg-zinc-300 mx-1" />
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:text-black bg-white rounded-none border border-zinc-300 hover:border-black transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Xem trang 3D
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="p-2 text-zinc-500 hover:text-red-600 rounded-none hover:bg-zinc-100 transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </nav>
        </div>
      </header>

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-12">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar: Square, Light, Uniformly Aligned */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-sm">
        <Link
          href="/studio"
          className="flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-bold text-zinc-900 hover:text-black"
        >
          <Sparkles className="w-5 h-5 text-zinc-900" />
          <span>Kỷ niệm</span>
        </Link>
        <Link
          href="/studio/settings"
          className="flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium text-zinc-500 hover:text-zinc-900"
        >
          <Settings className="w-5 h-5 text-zinc-600" />
          <span>Cài đặt</span>
        </Link>
        <Link
          href="/"
          className="flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium text-zinc-500 hover:text-zinc-900"
        >
          <Eye className="w-5 h-5 text-zinc-600" />
          <span>Trang 3D</span>
        </Link>
      </nav>
    </div>
  );
}
