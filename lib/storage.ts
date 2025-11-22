// =====================================
// lib/storage.ts
// Supabase Storage の公開URL生成ヘルパー
// =====================================

// assets バケットの画像パスから公開URLを作る関数
export function getAssetPublicUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return "";
  }
  // public バケットの固定パス
  return `${baseUrl}/storage/v1/object/public/assets/${path}`;
}
