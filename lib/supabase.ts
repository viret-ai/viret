// =====================================
// lib/supabase.ts
// ブラウザ側（anon key）Supabase クライアント
// =====================================

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
