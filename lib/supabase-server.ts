// =====================================
// lib/supabase-server.ts
// Next.js16 の cookies() Promise 仕様に対応したサーバークライアント
// =====================================

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const cookieStore = await cookies(); // ← ★ Next 16: cookies() は Promise

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // 読み込み
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // 書き込み
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Route Handler 以外では set が無効な場合があるので握りつぶす
          }
        },
        // 削除
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // 同上
          }
        },
      },
    }
  );
}
