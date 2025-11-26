// =====================================
// lib/supabase-server.ts
// Next.js App Router（サーバー）用 Supabase クライアント
// - @supabase/ssr + next/headers(cookies) を使用
// - Next.js 16: cookies() は Promise → 関数を async にして中で await
// =====================================

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function supabaseServer(): Promise<SupabaseClient> {
  // Next.js 16 では cookies() は Promise
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // セッション読み取り用
        getAll() {
          return cookieStore.getAll();
        },
        // セッション書き込み用
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as CookieOptions);
            });
          } catch {
            // Server Component から呼ばれた場合など、
            // 書き込み禁止な環境では例外になることがあるので無視して OK
          }
        },
      },
    }
  );
}
