"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type ProcessingState = "idle" | "loading" | "success" | "error";
type AuthState = "loading" | "logged_out" | "logged_in";

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

export default function HomePage() {
  const [state, setState] = useState<ProcessingState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [origPreview, setOrigPreview] = useState<string | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [auth, setAuth] = useState<AuthState>("loading");
  const [user, setUser] = useState<{ email: string; name: string; picture?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultDataRef = useRef<Blob | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setAuth("logged_in");
          setUser(data.user);
        } else {
          setAuth("logged_out");
        }
      })
      .catch(() => setAuth("logged_out"));
  }, []);

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
      const blob = await callRemoveBgApi(file);
      resultDataRef.current = blob;
      const url = URL.createObjectURL(blob);
      setResultPreview(url);
      setState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "网络错误，请检查网络后重试");
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

  const handleDownload = useCallback(() => {
    if (!resultDataRef.current) return;
    const url = URL.createObjectURL(resultDataRef.current);
    const a = document.createElement("a");
    a.href = url;
    a.download = "removed-bg.png";
    a.click();
    URL.revokeObjectURL(url);
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
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          使用 Google 账号登录
        </a>
        <footer className="mt-16 text-xs text-neutral-700 text-center">
          图片仅在内存中处理，不做任何存储
        </footer>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 max-w-2xl mx-auto w-full">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        {user?.picture && (
          <img src={user.picture} alt="avatar" className="w-8 h-8 rounded-full" />
        )}
        <div className="text-right">
          <p className="text-xs text-neutral-400">{user?.email}</p>
          <a href="/api/logout" className="text-xs text-red-400 hover:text-red-300">退出</a>
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold text-white mb-1">🖼️ 图片背景移除</h1>
        <p className="text-sm text-neutral-500">Remove.bg · Cloudflare Pages</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          w-full rounded-2xl border-2 border-dashed cursor-pointer
          transition-all duration-200 text-center
          ${isDragging ? "border-neutral-500 bg-neutral-900" : "border-neutral-700 bg-neutral-900/60 hover:border-neutral-500 hover:bg-neutral-900"}
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
          className="fixed -translate-x-full opacity-0 pointer-events-none"
          onChange={handleInputChange}
          disabled={state === "loading"}
        />
      </div>

      {state === "error" && errorMsg && (
        <div className="w-full mt-4 px-4 py-3 rounded-xl bg-red-900/30 border border-red-800 text-red-400 text-sm text-center">
          {errorMsg}
        </div>
      )}

      {(origPreview || resultPreview) && (
        <div className="w-full mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          {origPreview && (
            <div className="text-center">
              <img src={origPreview} alt="原图" className="max-w-56 max-h-56 rounded-xl border border-neutral-800 object-contain" />
              <p className="mt-2 text-xs text-neutral-600">原图</p>
            </div>
          )}
          {resultPreview && (
            <div className="text-center">
              <img src={resultPreview} alt="已移除背景" className="max-w-56 max-h-56 rounded-xl border border-neutral-800 object-contain" style={{ backgroundImage: "repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)", backgroundSize: "16px 16px" }} />
              <p className="mt-2 text-xs text-neutral-600">已移除背景</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex gap-3">
        {state === "success" && (
          <button onClick={handleDownload} className="px-6 py-2.5 bg-white text-black font-semibold rounded-xl text-sm hover:bg-neutral-200 transition-colors">
            下载 PNG
          </button>
        )}
        {(state === "success" || state === "error") && (
          <button onClick={reset} className="px-6 py-2.5 bg-neutral-800 text-neutral-300 font-medium rounded-xl text-sm hover:bg-neutral-700 transition-colors border border-neutral-700">
            重新上传
          </button>
        )}
      </div>

      <footer className="mt-16 text-xs text-neutral-700 text-center">
        图片仅在内存中处理，不做任何存储
      </footer>
    </main>
  );
}
