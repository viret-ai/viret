// =====================================
// lib/supabase-server.ts
// Next.js 16 + @supabase/ssr 用サーバークライアント
// - cookies() は Promise
// - getAll / setAll 方式でセッション cookie を橋渡し
// =====================================

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const cookieStore = await cookies(); // Next 16: cookies() は Promise 返却

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // 全 cookie を Supabase 側に渡す（読み込み）
        getAll() {
          return cookieStore.getAll();
        },
        // Supabase が更新したい cookie 一式を反映（書き込み）
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as CookieOptions);
            });
          } catch {
            // Server Components など set が無効な場所ではエラーを握りつぶす
            // （Route Handler / Server Action から呼ばれた場合のみ実際に書き込まれる）
          }
        },
      },
    }
  );
}
