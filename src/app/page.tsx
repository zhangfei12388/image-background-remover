"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import TopUpModal from "@/components/TopUpModal";
import ComparisonSlider from "@/components/ComparisonSlider";

type ProcessingState = "idle" | "loading" | "success" | "error";
type AuthState = "loading" | "logged_out" | "logged_in";
type DownloadFormat = "png" | "white" | "custom";

const REMOVE_BG_API_KEY = process.env.NEXT_PUBLIC_REMOVE_BG_API_KEY || "";

async function callRemoveBgApi(file: File): Promise<Blob> {
  const formData = new FormData();
  formData.append("image_file", file);
  formData.append("size", "auto");
  formData.append("format", "png");

  const res = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: {
      "X-Api-Key": REMOVE_BG_API_KEY,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = `错误 ${res.status}`;
    try {
      const json = JSON.parse(text);
      msg = json.errors?.[0]?.detail || json.errors?.[0]?.title || msg;
    } catch {}
    throw new Error(msg);
  }

  return res.blob();
}

// 将透明PNG与背景色合成
async function compositeWithBackground(
  transparentBlob: Blob,
  bgColor: string = "#ffffff"
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法创建画布上下文"));
        return;
      }

      // 绘制背景色
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制透明图片
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("无法生成图片"));
        }
      }, "image/png");
    };
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = URL.createObjectURL(transparentBlob);
  });
}

export default function HomePage() {
  const [state, setState] = useState<ProcessingState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [origPreview, setOrigPreview] = useState<string | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [auth, setAuth] = useState<AuthState>("loading");
  const [user, setUser] = useState<{ email: string; name: string; picture?: string } | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [customBgColor, setCustomBgColor] = useState("#ffffff");
  const [downloading, setDownloading] = useState<DownloadFormat | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultDataRef = useRef<Blob | null>(null);
  const originalFileRef = useRef<File | null>(null);

  // 获取用户信息和积分
  const fetchUserAndCredits = useCallback(async () => {
    try {
      const [authRes, creditsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/credits"),
      ]);

      const authData = await authRes.json();
      const creditsData = await creditsRes.json();

      if (authData.authenticated) {
        setAuth("logged_in");
        setUser(authData.user);
        setCredits(creditsData.credits ?? 0);
      } else {
        setAuth("logged_out");
      }
    } catch {
      setAuth("logged_out");
    }
  }, []);

  useEffect(() => {
    fetchUserAndCredits();
  }, [fetchUserAndCredits]);

  const reset = useCallback(() => {
    setState("idle");
    setErrorMsg("");
    setOrigPreview(null);
    setResultPreview(null);
    setShowDownloadOptions(false);
    resultDataRef.current = null;
    originalFileRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (credits !== null && credits <= 0) {
      setShowTopUp(true);
      return;
    }

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
    originalFileRef.current = file;

    setState("loading");
    setErrorMsg("");
    setResultPreview(null);
    setShowDownloadOptions(false);
    resultDataRef.current = null;

    try {
      const blob = await callRemoveBgApi(file);
      resultDataRef.current = blob;
      const url = URL.createObjectURL(blob);
      setResultPreview(url);
      setState("success");
      // 扣除积分
      if (credits !== null) {
        setCredits((c) => (c !== null ? c - 1 : null));
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "网络错误，请检查网络后重试");
      setState("error");
    }
  }, [credits]);

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
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const onWindowDragOver = (e: DragEvent) => e.preventDefault();
    const onWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer?.files[0];
      if (file) handleFile(file);
    };
    window.addEventListener("dragover", onWindowDragOver);
    window.addEventListener("drop", onWindowDrop);
    return () => {
      window.removeEventListener("dragover", onWindowDragOver);
      window.removeEventListener("drop", onWindowDrop);
    };
  }, [handleFile]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadPng = useCallback(() => {
    if (!resultDataRef.current) return;
    downloadBlob(resultDataRef.current, "removed-bg.png");
    setShowDownloadOptions(false);
  }, [resultDataRef, downloadBlob]);

  const handleDownloadWhite = useCallback(async () => {
    if (!resultDataRef.current) return;
    setDownloading("white");
    try {
      const blob = await compositeWithBackground(resultDataRef.current, "#ffffff");
      downloadBlob(blob, "removed-bg-white.png");
    } catch (err) {
      setErrorMsg("下载失败，请重试");
    }
    setDownloading(null);
    setShowDownloadOptions(false);
  }, [resultDataRef, downloadBlob]);

  const handleDownloadCustom = useCallback(async () => {
    if (!resultDataRef.current) return;
    setDownloading("custom");
    try {
      const blob = await compositeWithBackground(resultDataRef.current, customBgColor);
      downloadBlob(blob, `removed-bg-${customBgColor.replace("#", "")}.png`);
    } catch (err) {
      setErrorMsg("下载失败，请重试");
    }
    setDownloading(null);
    setShowDownloadOptions(false);
  }, [resultDataRef, customBgColor, downloadBlob]);

  const handleTopUpSuccess = useCallback((newCredits: number) => {
    setCredits((c) => (c !== null ? c + newCredits : newCredits));
  }, []);

  useEffect(() => {
    return () => {
      if (resultPreview) URL.revokeObjectURL(resultPreview);
      if (origPreview && origPreview.startsWith("blob:")) URL.revokeObjectURL(origPreview);
    };
  }, [resultPreview, origPreview]);

  if (auth === "loading") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 max-w-2xl mx-auto w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
          <p className="text-neutral-500 text-sm">加载中…</p>
        </div>
      </main>
    );
  }

  if (auth === "logged_out") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 max-w-2xl mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-white mb-1">🖼️ 图片背景移除</h1>
          <p className="text-sm text-neutral-500">请先登录后再使用</p>
        </div>
        <a
          href="/api/auth/google"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl text-base hover:bg-neutral-200 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          使用 Google 账号登录
        </a>
        <footer className="mt-16 text-xs text-neutral-700 text-center">图片仅在内存中处理，不做任何存储</footer>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 max-w-2xl mx-auto w-full">
      {/* 顶部导航 */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user?.picture && <img src={user.picture} alt="avatar" className="w-8 h-8 rounded-full" />}
          <div>
            <p className="text-xs text-neutral-400">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-neutral-900/80 border border-neutral-800 rounded-full px-4 py-2">
            <span className="text-sm text-neutral-400">积分:</span>
            <span className="text-sm font-semibold text-white">{credits ?? "-"}</span>
            <button onClick={() => setShowTopUp(true)} className="text-xs text-blue-400 hover:text-blue-300 font-medium ml-2">
              充值
            </button>
          </div>
          <a href="/api/logout" className="text-xs text-red-400 hover:text-red-300">
            退出
          </a>
        </div>
      </div>

      {/* 标题 */}
      <div className="text-center mb-8 mt-8">
        <h1 className="text-3xl font-semibold text-white mb-1">🖼️ 图片背景移除</h1>
        <p className="text-sm text-neutral-500">Remove.bg · 每次处理消耗 1 积分</p>
      </div>

      {/* 上传区域 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => {
          if (credits !== null && credits <= 0) {
            setShowTopUp(true);
          } else {
            fileInputRef.current?.click();
          }
        }}
        className={`
          w-full rounded-2xl border-2 border-dashed cursor-pointer
          transition-all duration-200 text-center
          ${isDragging ? "border-neutral-500 bg-neutral-900" : "border-neutral-700 bg-neutral-900/60 hover:border-neutral-500 hover:bg-neutral-900"}
          ${state === "loading" ? "pointer-events-none opacity-60" : ""}
          ${credits !== null && credits <= 0 ? "opacity-60 cursor-not-allowed" : ""}
        `}
      >
        <div className="py-14 px-6">
          {credits !== null && credits <= 0 ? (
            <p className="text-yellow-500 text-base">
              积分不足，请先充值
              <br />
              <span className="text-neutral-600 text-sm">点击此处充值</span>
            </p>
          ) : state !== "loading" ? (
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
          className="fixed -translate-x-full opacity-0 pointer-events-none"
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

      {/* 对比滑块 */}
      {state === "success" && origPreview && resultPreview && (
        <div className="w-full mt-8">
          <p className="text-center text-sm text-neutral-400 mb-3">拖动滑块对比</p>
          <div className="flex justify-center">
            <ComparisonSlider originalImage={origPreview} resultImage={resultPreview} />
          </div>
        </div>
      )}

      {/* 下载按钮 */}
      <div className="mt-8 flex gap-3 flex-wrap justify-center">
        {state === "success" && (
          <div className="relative">
            <button
              onClick={() => setShowDownloadOptions(!showDownloadOptions)}
              className="px-6 py-2.5 bg-white text-black font-semibold rounded-xl text-sm hover:bg-neutral-200 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载
              <svg className={`w-4 h-4 transition-transform ${showDownloadOptions ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 下载选项 */}
            {showDownloadOptions && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl z-10 overflow-hidden">
                <button
                  onClick={handleDownloadPng}
                  className="w-full px-4 py-3 text-left hover:bg-neutral-800 transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded bg-neutral-700 flex items-center justify-center">
                    <svg className="w-4 h-4 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-white">透明 PNG</p>
                    <p className="text-xs text-neutral-500">支持透明背景</p>
                  </div>
                </button>
                <button
                  onClick={handleDownloadWhite}
                  disabled={downloading === "white"}
                  className="w-full px-4 py-3 text-left hover:bg-neutral-800 transition-colors flex items-center gap-3 disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded bg-white border border-neutral-300 flex items-center justify-center">
                    <svg className="w-4 h-4 text-neutral-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-white">白底 PNG</p>
                    <p className="text-xs text-neutral-500">白色背景</p>
                  </div>
                </button>
                <div className="px-4 py-3 border-t border-neutral-800">
                  <p className="text-xs text-neutral-400 mb-2">自定义背景色</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm text-white uppercase"
                    />
                    <button
                      onClick={handleDownloadCustom}
                      disabled={downloading === "custom"}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors disabled:opacity-50"
                    >
                      {downloading === "custom" ? "..." : "下载"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
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

      {/* 使用提示 */}
      {state === "success" && (
        <div className="mt-6 text-center text-xs text-neutral-500">
          <p>💡 提示：透明背景 PNG 适合设计使用，白底版本适合电商平台</p>
        </div>
      )}

      <footer className="mt-16 text-xs text-neutral-700 text-center">图片仅在内存中处理，不做任何存储</footer>

      {/* 充值弹窗 */}
      <TopUpModal isOpen={showTopUp} onClose={() => setShowTopUp(false)} onSuccess={handleTopUpSuccess} isSandbox={true} />
    </main>
  );
}
