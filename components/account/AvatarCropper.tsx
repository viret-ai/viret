// =====================================
// components/account/AvatarCropper.tsx
// アバター画像クロップ用モーダル UI（中心基準・原寸スタート）
// - プレビュー円：直径 256px（最終出力 512×512 の 1/2）
// - スライダー：0.0〜1.0
//   - 0.0 → 0.5倍（50%）
//   - 0.5 → 1.0倍（100% / 原寸）※初期位置
//   - 1.0 → 2.0倍（200%）
// - 画像の中心を円の中心に合わせ、そこからドラッグで位置調整
// - グローバルの img{max-width:100%} を無効化して「本当の原寸」を使う
// - 確定時に 512×512 PNG の Blob を onComplete に返す
// =====================================

"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import { typography } from "@/lib/theme";

type AvatarCropperProps = {
  src: string; // 選択された元画像の Object URL
  onCancel: () => void;
  onComplete: (blob: Blob) => void;
};

const VIEWPORT_SIZE = 256; // 画面上の円の直径（px）
const OUTPUT_SIZE = 512; // 実際に保存する画像の一辺（px）

export function AvatarCropper({ src, onCancel, onComplete }: AvatarCropperProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);

  // スライダー値（0.0〜1.0）
  const [slider, setSlider] = useState(0.5); // 中央スタート＝原寸
  // オフセット：円の中心からのズレ量（px）
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // スライダー値 → 実際のスケール（0.5〜2.0倍）
  // - 0.0〜0.5 の区間：0.5〜1.0 に線形変換
  // - 0.5〜1.0 の区間：1.0〜2.0 に線形変換
  const scale = slider <= 0.5
    ? 0.5 + slider * 1.0 // 0→0.5, 0.5→1.0
    : 1.0 + (slider - 0.5) * 2.0; // 0.5→1.0, 1.0→2.0

  // 画像読み込み時：原寸スケール＋中心配置でスタート
  const handleImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;

    // naturalWidth / naturalHeight が 0 になることへの保険
    const naturalWidth = img.naturalWidth || VIEWPORT_SIZE;
    const naturalHeight = img.naturalHeight || VIEWPORT_SIZE;

    // この時点では naturalWidth/Height 自体を変えず、scale=1.0 と中心配置だけセット
    if (naturalWidth && naturalHeight) {
      setSlider(0.5); // 中央＝1.0倍
      setOffset({ x: 0, y: 0 }); // 中心からのズレ無し
    }

    setImageLoaded(true);
  };

  // 画像ソースが変わったときは状態リセット
  useEffect(() => {
    setSlider(0.5);
    setOffset({ x: 0, y: 0 });
    setImageLoaded(false);
  }, [src]);

  // ドラッグ開始
  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
    setLastPos({ x: event.clientX, y: event.clientY });
  };

  // ドラッグ中
  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.preventDefault();

    const dx = event.clientX - lastPos.x;
    const dy = event.clientY - lastPos.y;

    setOffset((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));
    setLastPos({ x: event.clientX, y: event.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // ズームスライダー変更
  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setSlider(value);
    // offset は「中心からのズレ量」として扱うのでここで補正はしない
  };

  // 確定 → canvas で 512×512 にトリミングして Blob 化
  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const naturalWidth = img.naturalWidth || VIEWPORT_SIZE;
    const naturalHeight = img.naturalHeight || VIEWPORT_SIZE;

    // 表示上での画像サイズ（px）
    const displayWidth = naturalWidth * scale;
    const displayHeight = naturalHeight * scale;

    // ビュー（256×256）の中心座標（px）
    const viewCenterX = VIEWPORT_SIZE / 2;
    const viewCenterY = VIEWPORT_SIZE / 2;

    // 画像中心の座標（ビュー内）＝ビュー中心＋offset
    const centerX = viewCenterX + offset.x;
    const centerY = viewCenterY + offset.y;

    // ビュー内での画像左上座標
    const viewTopLeftX = centerX - displayWidth / 2;
    const viewTopLeftY = centerY - displayHeight / 2;

    // ビュー座標 → 元画像座標へのスケール
    const scaleX = naturalWidth / displayWidth;
    const scaleY = naturalHeight / displayHeight;

    // ビュー内の 0,0〜256,256 が、元画像上のどこに対応するかを計算
    const sx = (0 - viewTopLeftX) * scaleX;
    const sy = (0 - viewTopLeftY) * scaleY;
    const sw = VIEWPORT_SIZE * scaleX;
    const sh = VIEWPORT_SIZE * scaleY;

    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onComplete(blob);
        }
      },
      "image/png",
      0.92
    );
  };

  // Esc キーでキャンセル
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl">
        <h2 className={typography("h2") + " mb-3 text-slate-900"}>
          アイコンのトリミング
        </h2>
        <p className={typography("caption") + " mb-4 text-slate-600"}>
          512×512px のアイコンとして保存されます。
          <br />
          円の中に収めたい位置まで、ドラッグとズームで調整してください。
        </p>

        {/* プレビュー円 */}
        <div
          className="mx-auto mb-4 flex items-center justify-center"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="relative overflow-hidden rounded-full border border-slate-300 bg-slate-100"
            style={{
              width: VIEWPORT_SIZE,
              height: VIEWPORT_SIZE,
              cursor: isDragging ? "grabbing" : "grab",
            }}
            onMouseDown={handleMouseDown}
          >
            <img
              ref={imgRef}
              src={src}
              alt="crop target"
              onLoad={handleImageLoad}
              draggable={false}
              style={{
                position: "absolute",
                // 画像の中心をビューの中心に合わせる（そこから offset でズラす）
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: "center center",
                userSelect: "none",
                pointerEvents: "none",
                // ★ グローバルの img { max-width:100% } を無効化して原寸を使う
                maxWidth: "none",
                maxHeight: "none",
                width: "auto",
                height: "auto",
              }}
            />
          </div>
        </div>

        {/* ズームスライダー */}
        <div className="mb-4">
          <label className={typography("caption") + " text-slate-700"}>
            拡大・縮小（左：50% / 中央：100% / 右：200%）
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={slider}
            onChange={handleSliderChange}
            className="mt-1 w-full"
          />
        </div>

        {/* ボタン */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!imageLoaded}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-1.5 text-xs font-semibold text-slate-50 hover:bg-slate-800 disabled:opacity-50"
          >
            この範囲で保存する（512×512）
          </button>
        </div>
      </div>
    </div>
  );
}
