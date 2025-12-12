// =====================================
// lib/avatar.ts
// アイコンURLのフォールバック取得
// =====================================

export const DEFAULT_AVATAR_SRC = "/system/default-avatar.png";

export function getAvatarSrc(
  avatar_url: string | null | undefined
): string {
  return avatar_url || DEFAULT_AVATAR_SRC;
}
