// =====================================
// lib/supabase.ts（ブラウザ用）
// ブラウザ Supabase Client（シングルトン固定）
// - dev/HMR 等でクライアントが複数生成されると refresh が競合して
//   refresh_token_already_used が出やすいので window に退避して 1個に固定
// =====================================

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __viretSupabase?: SupabaseClient;
  }
}

function buildClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export const supabase: SupabaseClient = (() => {
  // // 事故防止：万一サーバー側で import された場合でも落とさない
  if (typeof window === "undefined") {
    return buildClient();
  }

  // // dev/HMR 対策：同一タブ内でクライアントが増殖しないように固定
  if (!window.__viretSupabase) {
    window.__viretSupabase = buildClient();
  }

  return window.__viretSupabase;
})();
