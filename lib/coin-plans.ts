// =====================================
// lib/coin-plans.ts
// コイン購入プラン定義（v0）
// - coinsページから参照する固定プラン一覧
// - label / description / amountYen をここで管理する
// =====================================

export type CoinPlan = {
  id: string;
  label: string;
  description: string;
  amountYen: number;
};

// コイン購入プラン（暫定）
// - あとで金額やプラン構成は自由に変えてOK
export const COIN_PLANS: CoinPlan[] = [
  {
    id: "starter",
    label: "スターターパック",
    description: "お試し用の少額コイン。まずは使い心地を確かめたい方向け。",
    amountYen: 500,
  },
  {
    id: "standard",
    label: "スタンダードパック",
    description: "DLや依頼にバランスよく使える基本パック。",
    amountYen: 2000,
  },
  {
    id: "pro",
    label: "プロパック",
    description: "継続的に素材DLやレタッチ依頼を行う方向けの大口パック。",
    amountYen: 5000,
  },
];
