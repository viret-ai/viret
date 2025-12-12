// =====================================
// app/account/avatar/page.tsx
// ユーザーアイコン設定ページ（クロップ対応版）
// - ファイル選択 or D&D → クロップモーダル表示
// - クロップ確定 → 512×512 PNG Blob を /api/account/avatar に POST
// - /api/account/avatar/reset に POST（初期アイコンに戻す）
// - アップロード済みアイコンを丸くプレビュー表示
// - avatar_url が無いときは default-avatar.png を表示
// =====================================

"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ui/Card";
import { typography } from "@/lib/theme";
import { AvatarCropper } from "@/components/account/AvatarCropper";

type AvatarState = {
  currentUrl: string | null; // DB に保存されている avatar_url
  previewUrl: string | null; // クロップ後のローカルプレビュー
};

// ※ ここだけ Void の実ファイル配置に合わせてください。
const DEFAULT_AVATAR_SRC = "/images/default-avatar.png";

export default function AvatarPage() {
  const router = useRouter();

  const [avatar, setAvatar] = useState<AvatarState>({
    currentUrl: null,
    previewUrl: null,
  });
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // クロップ用モーダル状態
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  // ------------------------------
  // 初期ロード：現在の avatar_url を取得
  // ------------------------------
  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        setMessage("ログインしていません。");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setMessage("現在のアイコン情報を取得できませんでした。");
        return;
      }

      if (profile?.avatar_url) {
        setAvatar((prev) => ({ ...prev, currentUrl: profile.avatar_url }));
      }
    };

    load();
  }, []);

  // ------------------------------
  // 共通：512×512 Blob をアップロードする処理
  // ------------------------------
  const uploadCroppedBlob = async (blob: Blob) => {
    setMessage(null);
    setLoading(true);

    try {
      const file = new File([blob], "avatar.png", { type: "image/png" });
      const formData = new FormData();
      formData.append("file", file);

      // プレビューは先に差し替えておく（楽観更新）
      const localUrl = URL.createObjectURL(blob);
      setAvatar((prev) => ({
        ...prev,
        previewUrl: localUrl,
      }));

      const res = await fetch("/api/account/avatar", {
        method: "POST",
        body: formData,
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(json?.error ?? "アップロードに失敗しました。");
        return;
      }

      setAvatar({
        currentUrl: json?.avatarUrl ?? null,
        previewUrl: null,
      });
      setMessage("アイコンを更新しました。");
    } catch (e) {
      console.error(e);
      setMessage("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // クロップ完了時コールバック
  // ------------------------------
  const handleCropComplete = async (blob: Blob) => {
    setShowCropper(false);
    setCropSrc(null);
    await uploadCroppedBlob(blob);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropSrc(null);
  };

  // ------------------------------
  // 画像ファイル選択 → クロップモーダルを開く
  // ------------------------------
  const startCropWithFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setMessage("画像ファイルのみアップロードできます。");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setShowCropper(true);
    setMessage(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    startCropWithFile(file);
  };

  // ------------------------------
  // ドラッグ＆ドロップ
  // ------------------------------
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!loading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (loading) return;

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    startCropWithFile(file);
  };

  // ------------------------------
  // 初期アイコンにリセット
  // ------------------------------
  const handleResetToDefault = async () => {
    setMessage(null);
    setResetting(true);
    try {
      const res = await fetch("/api/account/avatar/reset", {
        method: "POST",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(json?.error ?? "初期アイコンへのリセットに失敗しました。");
        return;
      }

      // ローカル状態を初期化
      setAvatar({
        currentUrl: null,
        previewUrl: null,
      });
      setMessage("初期アイコンに戻しました。");

      // ★ ここで RSC / auth 状態を再同期（＝実質リロード）
      router.refresh();
    } catch (e) {
      console.error(e);
      setMessage("通信エラーが発生しました。");
    } finally {
      setResetting(false);
    }
  };

  const displaySrc =
    avatar.previewUrl || avatar.currentUrl || DEFAULT_AVATAR_SRC;

  const isBusy = loading || resetting;

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)] px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-2">
          <h1 className={typography("h1")}>アイコン設定</h1>
          <p className={typography("body")}>
            プロフィールや各種リストに表示されるアイコン画像を変更できます。
          </p>
        </header>

        <Card className="p-6 space-y-5">
          {/* プレビュー */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-[120px] w-[120px]">
              <Image
                src={displaySrc}
                alt="avatar preview"
                fill
                sizes="120px"
                className="rounded-full object-cover border border-black/10 bg-slate-200"
              />
            </div>

            <p
              className={
                typography("caption") + " text-slate-600 text-center"
              }
            >
              PNG / JPEG / WebP（最大 5MB 程度までを推奨）
              <br />
              推奨サイズは 512×512px の正方形です。
            </p>
          </div>

          {/* ドロップゾーン＋ファイル選択ボタン */}
          <div
            className={[
              "mt-4 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
              isDragging
                ? "border-[var(--v-accent)] bg-[var(--v-accent)]/5"
                : "border-slate-300 bg-slate-50",
            ].join(" ")}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <p className={typography("body")}>
              ここに画像ファイルをドラッグ＆ドロップするか、
              <br />
              下のボタンからファイルを選択してください。
            </p>

            <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-[var(--v-accent)] bg-[var(--v-accent)]/10 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[var(--v-accent)]/20">
              {loading ? "アップロード中…" : "画像ファイルを選択する"}
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={isBusy}
              />
            </label>
          </div>

          {/* 注意文言（公開範囲など） */}
          <div className="space-y-1 text-[11px] text-slate-600 mt-3">
            <p>
              ・アップロードしたアイコンは、プロフィールページや案件一覧などで
              他のユーザーにも公開されます。
            </p>
            <p>
              ・肖像権・著作権を侵害する画像、公序良俗に反する画像の利用はできません。
            </p>
            <p>・顔写真の利用は自己責任で行ってください。</p>
            <p>
              ・アイコン更新がうまく反映されない場合は、ページの再読み込みで改善することがあります。
            </p>
          </div>

          {/* 初期アイコンにリセット */}
          <div className="mt-6 flex flex-col gap-2 border-t border-black/5 pt-4">
            <p className={typography("caption") + " text-slate-700"}>
              初期アイコンに戻す
            </p>
            <p className={typography("caption") + " text-slate-500"}>
              現在設定されているアイコンを解除し、Viret 共通のデフォルトアイコンに戻します。
            </p>
            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={isBusy}
              className="inline-flex w-fit items-center justify-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {resetting ? "リセット中…" : "初期アイコンに戻す"}
            </button>
          </div>

          {message && (
            <p
              className={
                typography("caption") +
                " text-slate-700 mt-4 whitespace-pre-line"
              }
            >
              {message}
            </p>
          )}
        </Card>
      </div>

      {/* クロップモーダル */}
      {showCropper && cropSrc && (
        <AvatarCropper
          src={cropSrc}
          onCancel={handleCropCancel}
          onComplete={handleCropComplete}
        />
      )}
    </main>
  );
}
