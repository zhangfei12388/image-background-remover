"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type ProcessingState = "idle" | "loading" | "success" | "error";

export default function HomePage() {
  const [state, setState] = useState<ProcessingState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [origPreview, setOrigPreview] = useState<string | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultDataRef = useRef<Blob | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setErrorMsg("");
    setOrigPreview(null);
    setResultPreview(null);
    resultDataRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("请选择图片文件");
      setState("error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("文件大小不能超过 10MB");
      setState("error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setOrigPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setState("loading");
    setErrorMsg("");
    setResultPreview(null);
    resultDataRef.current = null;

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/remove-bg", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let msg = `错误 ${res.status}`;
        try {
          const json = await res.json();
          msg = json.error || msg;
        } catch {
          msg = await res.text() || msg;
        }
        setErrorMsg(msg);
        setState("error");
        return;
      }

      const blob = await res.blob();
      resultDataRef.current = blob;
      const url = URL.createObjectURL(blob);
      setResultPreview(url);
      setState("success");
    } catch (err) {
      setErrorMsg("网络错误，请检查网络后重试");
      setState("error");
    }
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      reset();
      processFile(file);
    },
    [reset, processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDownload = useCallback(() => {
    if (!resultDataRef.current) return;
    const url = URL.createObjectURL(resultDataRef.current);
    const a = document.createElement("a");
    a.href = url;
    a.download = "removed-bg.png";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // 清理 blob URL
  useEffect(() => {
    return () => {
      if (resultPreview) URL.revokeObjectURL(resultPreview);
      if (origPreview && origPreview.startsWith("blob:")) URL.revokeObjectURL(origPreview);
    };
  }, [resultPreview, origPreview]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 max-w-2xl mx-auto w-full">
      {/* 标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold text-white mb-1">🖼️ 图片背景移除</h1>
        <p className="text-sm text-neutral-500">Remove.bg · Next.js</p>
      </div>

      {/* 拖拽上传区 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          w-full rounded-2xl border-2 border-dashed cursor-pointer
          transition-all duration-200 text-center
          ${isDragging
            ? "border-neutral-500 bg-neutral-900"
            : "border-neutral-700 bg-neutral-900/60 hover:border-neutral-500 hover:bg-neutral-900"
          }
          ${state === "loading" ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <div className="py-14 px-6">
          {state !== "loading" ? (
            <>
              <p className="text-neutral-400 text-base leading-relaxed">
                拖拽图片到这里
                <br />
                <span className="text-neutral-600 text-sm">或点击选择文件</span>
              </p>
              <p className="text-neutral-700 text-xs mt-3">支持 JPG / PNG / WebP，最大 10MB</p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-5 h-5 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
              <p className="text-neutral-500 text-sm">正在移除背景…</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleInputChange}
          disabled={state === "loading"}
        />
      </div>

      {/* 错误提示 */}
      {state === "error" && errorMsg && (
        <div className="w-full mt-4 px-4 py-3 rounded-xl bg-red-900/30 border border-red-800 text-red-400 text-sm text-center">
          {errorMsg}
        </div>
      )}

      {/* 预览区 */}
      {(origPreview || resultPreview) && (
        <div className="w-full mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          {origPreview && (
            <div className="text-center">
              <img
                src={origPreview}
                alt="原图"
                className="max-w-56 max-h-56 rounded-xl border border-neutral-800 object-contain"
              />
              <p className="mt-2 text-xs text-neutral-600">原图</p>
            </div>
          )}
          {resultPreview && (
            <div className="text-center">
              <img
                src={resultPreview}
                alt="已移除背景"
                className="max-w-56 max-h-56 rounded-xl border border-neutral-800 object-contain bg-checkered"
                style={{
                  backgroundImage:
                    "repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)",
                  backgroundSize: "16px 16px",
                }}
              />
              <p className="mt-2 text-xs text-neutral-600">已移除背景</p>
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="mt-8 flex gap-3">
        {state === "success" && (
          <button
            onClick={handleDownload}
            className="px-6 py-2.5 bg-white text-black font-semibold rounded-xl text-sm hover:bg-neutral-200 transition-colors"
          >
            下载 PNG
          </button>
        )}
        {(state === "success" || state === "error") && (
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-neutral-800 text-neutral-300 font-medium rounded-xl text-sm hover:bg-neutral-700 transition-colors border border-neutral-700"
          >
            重新上传
          </button>
        )}
      </div>

      {/* 隐私声明 */}
      <footer className="mt-16 text-xs text-neutral-700 text-center">
        图片仅在内存中处理，不做任何存储
      </footer>
    </main>
  );
}
