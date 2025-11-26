// =====================================
// components/layout/DevAdminLoginButton.tsx
// 開発環境専用：管理者ログインボタン（クライアント）
// =====================================

"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";

export default function DevAdminLoginButton() {
  const router = useRouter();

  const handleDevAdminLogin = async () => {
    if (process.env.NODE_ENV !== "development") return;

    const email = process.env.NEXT_PUBLIC_DEV_ADMIN_EMAIL || "";
    const password = process.env.NEXT_PUBLIC_DEV_ADMIN_PASSWORD || "";

    if (!email || !password) return;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      router.push("/dashboard");
    }
  };

  return (
    <Button
      type="button"
      variant="primary"
      size="sm"
      onClick={handleDevAdminLogin}
      className="px-2 py-1 text-[10px]"
    >
      管理者ログイン
    </Button>
  );
}
