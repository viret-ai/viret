// =====================================
// components/contracts/trade-room/modals/DeliveryBoxModal.tsx
// 納品BOX（v0）
// - ドラッグ＆ドロップ
// - 画像は背景切替で透過/ゴミ確認
// - チェック必須 + 拡張子指定（暫定：job/bundle内のどれかから拾う）
// - useEffect内で setState しない（警告回避）
// - startTransition は sync callback で包む（型/挙動安定）
// - postDelivery に deliveredExt / mimeType を渡して job_deliveries に記録
// =====================================

"use client";

import { useMemo, useState } from "react";
import type { ContractRoomBundle, JobDeliveryRow } from "@/lib/contracts/queries";
import { uploadDeliveryFile, postDelivery } from "@/lib/contracts/actions";
import {
  Modal,
  Field,
  CheckRow,
  BgPill,
  DeliveryDropzone,
  PreviewWithBg,
  type BgMode,
} from "@/components/contracts/trade-room/ui/TradeRoomUI";

type Props = {
  open: boolean;
  onClose: () => void;

  bundle: ContractRoomBundle;
  viewerId: string;
  latestDelivery: JobDeliveryRow | null;

  isPending: boolean;
  startTransition: (fn: () => void) => void;

  onToast: (msg: string) => void;
};

function normalizeExt(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().toLowerCase().replace(/^\./, "");
}

function getFileExt(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx === -1) return "";
  return name.slice(idx + 1).toLowerCase();
}

function isImageExt(ext: string): boolean {
  return ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
}

export default function DeliveryBoxModal(props: Props) {
  const job = props.bundle.job;

  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");

  const [bg, setBg] = useState<BgMode>("checker");
  const [checkPins, setCheckPins] = useState(false);

  // // 拡張子は「一致してるか(extOk)」+「本人が確認した(checkExtConfirm)」を分ける
  // // useEffectで自動setしない（warning回避）
  const [checkExtConfirm, setCheckExtConfirm] = useState(false);

  const [checkCleanup, setCheckCleanup] = useState(false);

  const reset = () => {
    setFile(null);
    setNote("");
    setBg("checker");
    setCheckPins(false);
    setCheckExtConfirm(false);
    setCheckCleanup(false);
  };

  // -----------------------
  // required ext（暫定拾い）
  // -----------------------
  const requiredExt = useMemo(() => {
    const anyJob = job as any;
    const anyBundle = props.bundle as any;

    return normalizeExt(
      anyJob?.required_ext ??
        anyJob?.output_ext ??
        anyJob?.delivery_ext ??
        anyJob?.requiredExt ??
        anyBundle?.requiredExt ??
        anyBundle?.job?.required_ext
    );
  }, [job, props.bundle]);

  const fileExt = useMemo(() => {
    if (!file) return "";
    return getFileExt(file.name);
  }, [file]);

  const extOk = useMemo(() => {
    if (!file) return false;
    if (!requiredExt) return true; // 指定がなければ許可（v0）
    if (!fileExt) return false;

    // jpg/jpeg 同一扱い
    if (requiredExt === "jpg" || requiredExt === "jpeg") {
      return fileExt === "jpg" || fileExt === "jpeg";
    }
    return fileExt === requiredExt;
  }, [file, requiredExt, fileExt]);

  const canSubmit =
    !!file &&
    (requiredExt ? extOk : true) &&
    checkPins &&
    checkExtConfirm &&
    checkCleanup &&
    !props.isPending;

  const submit = async () => {
    if (!file) {
      props.onToast("納品ファイルを選択してください");
      return;
    }
    if (requiredExt && !extOk) {
      props.onToast(`指定拡張子（.${requiredExt}）と一致しません`);
      return;
    }
    if (!checkPins || !checkExtConfirm || !checkCleanup) {
      props.onToast("チェック項目をすべて確認してください");
      return;
    }

    const versionNext = (props.latestDelivery?.version ?? 0) + 1;

    // // startTransition は「同期関数」を渡すのが前提なので async を直渡ししない
    props.startTransition(() => {
      void (async () => {
        const deliveredExtLocal = fileExt; // // UI側で見ている拡張子をそのまま渡す（サーバ側でも再抽出するので二重で安全）
        const up = await uploadDeliveryFile({
          jobId: job.id,
          ownerId: job.owner_id,
          version: versionNext,
          file,
        });

        if (!up.ok) {
          props.onToast(up.error ?? "アップロードに失敗しました");
          return;
        }

        const res = await postDelivery({
          jobId: job.id,
          retoucherId: props.viewerId,
          version: versionNext,
          filePath: up.data.path,
          note: note.trim(),

          // // 追加ログ：DBの delivered_ext / mime_type を埋める
          deliveredExt: deliveredExtLocal || null,
          mimeType: up.data.contentType ?? null,
        });

        if (res.ok) {
          props.onToast(`納品しました（v${versionNext}）`);
          props.onClose();
          reset();
        } else {
          props.onToast(res.error ?? "納品の登録に失敗しました");
        }
      })();
    });
  };

  return (
    <Modal
      open={props.open}
      title="納品（納品BOX）"
      description="ドラッグ＆ドロップでファイルを追加し、背景切替で透過/消し残しを確認してから送信してください。"
      onClose={() => {
        props.onClose();
      }}
    >
      <div className="space-y-3">
        <Field label="納品ファイル（ドラッグ＆ドロップ）">
          <DeliveryDropzone
            file={file}
            onPick={(f) => {
              setFile(f);
              // // ファイルが変わったら確認系はリセット
              setCheckExtConfirm(false);
            }}
            onClear={() => {
              setFile(null);
              setCheckExtConfirm(false);
            }}
            accept="image/*,.png,.jpg,.jpeg,.webp,.zip"
            disabled={props.isPending}
          />

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded border border-white/10 bg-white/5 p-2 text-xs">
              <div className="opacity-70">指定拡張子</div>
              <div className="mt-1 font-mono">
                {requiredExt ? `.${requiredExt}` : "（指定なし）"}
              </div>
            </div>
            <div className="rounded border border-white/10 bg-white/5 p-2 text-xs">
              <div className="opacity-70">選択中の拡張子</div>
              <div className="mt-1 font-mono">
                {file ? `.${fileExt || "?"}` : "（未選択）"}
              </div>
            </div>
          </div>

          {file && requiredExt && !extOk ? (
            <div className="mt-2 rounded border border-red-300/40 bg-red-50/10 p-2 text-xs">
              <div className="font-semibold">拡張子が一致しません</div>
              <div className="mt-1 opacity-80">
                指定：.{requiredExt} / 現在：.{fileExt || "?"}
              </div>
            </div>
          ) : null}
        </Field>

        {file && isImageExt(fileExt) ? (
          <Field label="プレビュー（背景切替で透過/ゴミ確認）">
            <div className="flex flex-wrap gap-2">
              <BgPill active={bg === "checker"} onClick={() => setBg("checker")}>
                市松
              </BgPill>
              <BgPill active={bg === "green"} onClick={() => setBg("green")}>
                グリーン
              </BgPill>
              <BgPill active={bg === "magenta"} onClick={() => setBg("magenta")}>
                マゼンタ
              </BgPill>
              <BgPill active={bg === "black"} onClick={() => setBg("black")}>
                ブラック
              </BgPill>
              <BgPill active={bg === "white"} onClick={() => setBg("white")}>
                ホワイト
              </BgPill>
            </div>

            <div className="mt-2 overflow-hidden rounded border border-white/10">
              <PreviewWithBg file={file} mode={bg} />
            </div>

            <div className="mt-1 text-xs opacity-70">
              透過の縁、半透明のゴミ、消し残し、色抜けを重点的にチェック。
            </div>
          </Field>
        ) : null}

        <Field label="送信前チェック（必須）">
          <div className="space-y-2">
            <CheckRow
              checked={checkPins}
              onChange={setCheckPins}
              label="ピン指示通りにレタッチしました"
            />

            <CheckRow
              checked={checkExtConfirm}
              onChange={setCheckExtConfirm}
              label={
                requiredExt
                  ? `指定拡張子（.${requiredExt}）で出力しました`
                  : "拡張子（形式）を確認しました"
              }
            />

            <CheckRow
              checked={checkCleanup}
              onChange={setCheckCleanup}
              label="透過ミス / 消し残し / 不要なゴミが無いことを背景切替で確認しました"
            />
          </div>
        </Field>

        <Field label="納品コメント（任意・自由入力）">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="w-full resize-none rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            placeholder="納品内容の補足、注意点など"
          />
        </Field>

        <div className="flex gap-2">
          <button
            className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
            onClick={submit}
            disabled={!canSubmit}
          >
            アップロードして納品する
          </button>

          <button
            className="rounded border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
            onClick={() => {
              props.onClose();
              reset();
            }}
            disabled={props.isPending}
            type="button"
          >
            キャンセル
          </button>
        </div>
      </div>
    </Modal>
  );
}
