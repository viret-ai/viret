// =====================================
// components/ui/Avatar.tsx
// 丸いユーザーアイコン（共通UI）
// =====================================

import Image from "next/image";
import Link from "next/link";
import { getAvatarSrc } from "@/lib/avatar";

type Props = {
  src?: string | null;
  size?: number;        // 例: 32, 48, 64 
  alt?: string;
  href?: string;        // プロフィールリンクつけたい時
};

export default function Avatar({ src, size = 32, alt = "avatar", href }: Props) {
  const img = getAvatarSrc(src);

  const content = (
    <div
      className="rounded-full overflow-hidden bg-slate-200 border border-black/5"
      style={{ width: size, height: size }}
    >
      <Image
        src={img}
        alt={alt}
        width={size}
        height={size}
        className="object-cover"
      />
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
