// =====================================
// lib/pins.ts
// レタッチ用ピン種別ごとの単価＋色定義＆内訳計算ロジック
// =====================================

// ピン種別（全体で共通利用したいのでここを正とする）
export type PinType = "hand" | "object" | "background" | "other";

// ピン1本あたりの料金ルール
export type PinPricingRule = {
  type: PinType;         // ピン種別
  label: string;         // UI表示用ラベル
  unitPrice: number;     // 1本あたりの単価（円）
  colorClass: string;    // Tailwind の色クラス（bg-blue-500 など）
  description?: string;  // 任意の説明文（ヘルプなどに利用）
};

// ラベルだけ欲しいとき用
export const PIN_TYPE_LABELS: Record<PinType, string> = {
  hand: "手・指の修正",
  object: "小物・オブジェクトの修正",
  background: "背景・不要物の除去",
  other: "その他の修正",
};

// 単価＋色テーブル（ここを書き換えれば価格と色が一括で変わる）
// ※ 金額・色は仮。あとで本番値に調整して OK。
export const PIN_PRICING_TABLE: PinPricingRule[] = [
  {
    type: "hand",
    label: PIN_TYPE_LABELS.hand,
    unitPrice: 500,
    colorClass: "bg-blue-500",
    description: "手・指・ポーズの修正など、難易度の高い部位の調整用ピンです。",
  },
  {
    type: "object",
    label: PIN_TYPE_LABELS.object,
    unitPrice: 1000,
    colorClass: "bg-emerald-500",
    description: "小物・衣装・アクセサリなど、限定的なオブジェクトの修正用ピンです。",
  },
  {
    type: "background",
    label: PIN_TYPE_LABELS.background,
    unitPrice: 3000,
    colorClass: "bg-rose-500",
    description: "背景の不要物除去や差分作成など、背景周りの修正用ピンです。",
  },
  {
    type: "other",
    label: PIN_TYPE_LABELS.other,
    unitPrice: 0,
    colorClass: "bg-slate-500",
    description: "上記に当てはまらない内容や、お任せ指定などに利用する汎用ピンです。",
  },
];

// type → ルール を素早く引けるようにしたマップ
export const PIN_PRICING_BY_TYPE: Record<PinType, PinPricingRule> =
  PIN_PRICING_TABLE.reduce(
    (acc, rule) => {
      acc[rule.type] = rule;
      return acc;
    },
    {} as Record<PinType, PinPricingRule>,
  );

// 型：内訳の1行分
export type PinPricingBreakdownRow = {
  type: PinType;      // hand / object / background / other
  label: string;      // 表示ラベル
  count: number;      // 本数
  unitPrice: number;  // 単価
  subtotal: number;   // 小計（count * unitPrice）
  colorClass: string; // 表示用カラークラス
};

// 計算結果のまとめ
export type PinPricingResult = {
  rows: PinPricingBreakdownRow[]; // 種別ごとの内訳行（本数0の種別は含めない）
  totalPins: number;              // ピン合計本数
  totalPrice: number;             // 合計金額（円）
};

// 外からルールを参照したいとき用ヘルパー
export function getPinPricingRule(type: PinType): PinPricingRule {
  return PIN_PRICING_BY_TYPE[type];
}

// pins 配列から内訳と合計を計算するメイン関数
// - pins は { type: PinType } を含む任意の構造で OK
export function calcPinPricing<T extends { type: PinType }>(
  pins: T[],
): PinPricingResult {
  // 種別ごとの本数をカウント
  const counts: Record<PinType, number> = {
    hand: 0,
    object: 0,
    background: 0,
    other: 0,
  };

  for (const pin of pins) {
    if (!PIN_PRICING_BY_TYPE[pin.type]) continue; // 念のため防御
    counts[pin.type] += 1;
  }

  const rows: PinPricingBreakdownRow[] = [];

  // テーブルの並び順にしたがって内訳行を作成
  for (const rule of PIN_PRICING_TABLE) {
    const count = counts[rule.type];
    if (count <= 0) continue; // 本数0の種別は表示しない

    const subtotal = count * rule.unitPrice;

    rows.push({
      type: rule.type,
      label: rule.label,
      count,
      unitPrice: rule.unitPrice,
      subtotal,
      colorClass: rule.colorClass,
    });
  }

  const totalPins = pins.length;
  const totalPrice = rows.reduce((sum, row) => sum + row.subtotal, 0);

  return {
    rows,
    totalPins,
    totalPrice,
  };
}

// ==============================
// 追加用テンプレ（コメントアウト）
// ピン種別を増やしたくなったときのメモ
// ==============================

/*

// 1) PinType に新しい種類を追加する
// export type PinType = "hand" | "object" | "background" | "other" | "face";

// 2) ラベル定義に追加する
// export const PIN_TYPE_LABELS: Record<PinType, string> = {
//   hand: "手・指の修正",
//   object: "小物・オブジェクトの修正",
//   background: "背景・不要物の除去",
//   other: "その他の修正",
//   face: "顔・表情の修正", // ← 追加
// };

// 3) PIN_PRICING_TABLE に新しいルールを1行追加
// PIN_PRICING_TABLE.push({
//   type: "face",
//   label: PIN_TYPE_LABELS.face,
//   unitPrice: 1500,
//   colorClass: "bg-purple-500",
//   description: "目・口・輪郭など、顔周りの調整用ピンです。",
// });

// 4) RetouchRequestEditor などで使うときは、
//    import { PIN_PRICING_TABLE, PIN_PRICING_BY_TYPE } from "@/lib/pinPricing";
//    として、
//    - ボタン定義      → PIN_PRICING_TABLE をそのまま map
//    - ピン描画の色    → rule.colorClass
//    - 料金計算・内訳 → calcPinPricing(pins)
//    を使えば、新しいピン種別も自動で反映されます。

*/

