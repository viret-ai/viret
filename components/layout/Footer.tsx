// =====================================
// components/layout/Footer.tsx
// サイト共通フッター（ライトテーマ）
// =====================================

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 mt-8">
      <div className="flex items-center justify-between">
        <span>&copy; {new Date().getFullYear()} Viret. All rights reserved.</span>
        <span className="text-slate-400">
          AI生成画像 × レタッチ × マーケット
        </span>
      </div>
    </footer>
  );
}
