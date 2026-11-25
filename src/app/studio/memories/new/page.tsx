import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import MemoryEditorForm from '@/components/studio/MemoryEditorForm';

export default function NewMemoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-zinc-200 pb-4">
        <Link
          href="/studio"
          className="p-2 bg-white border border-zinc-300 text-zinc-700 hover:text-black hover:border-black transition-colors rounded-none"
          title="Quay lại danh sách"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-bold text-zinc-900 flex items-center gap-2">
            <span>Thêm Kỷ Niệm Mới</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Kỷ niệm mới tạo sẽ được thắp sáng thành một vì sao trên dải ngân hà
          </p>
        </div>
      </div>

      <MemoryEditorForm isEditMode={false} />
    </div>
  );
}
