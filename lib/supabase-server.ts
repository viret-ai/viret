// =====================================
// lib/supabase-server.ts
// サーバー側（service_role）Supabase クライアント
// =====================================

import { createClient } from "@supabase/supabase-js";

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,     // URL は共通
  process.env.SUPABASE_SERVICE_ROLE_KEY!,    // ← サーバー専用の強い鍵
  {
    auth: {
      persistSession: false,                 // サーバー側ではセッション保持しない
    },
  }
);
