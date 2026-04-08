"use client";

import { useState, useEffect, useCallback } from "react";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (credits: number) => void;
  isSandbox?: boolean;
}

const PACKAGES = [
  { id: "10-credits", credits: 10, price: "$0.99", per: "$0.099/张" },
  { id: "50-credits", credits: 50, price: "$3.99", per: "$0.080/张", popular: true },
  { id: "100-credits", credits: 100, price: "$6.99", per: "$0.070/张" },
  { id: "500-credits", credits: 500, price: "$29.99", per: "$0.060/张" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const paypal: any;

export default function TopUpModal({ isOpen, onClose, onSuccess, isSandbox = true }: TopUpModalProps) {
  const [selectedPkg, setSelectedPkg] = useState("50-credits");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paypalReady, setPaypalReady] = useState(false);

  const loadPayPalScript = useCallback(() => {
    if (document.querySelector('script[src*="paypal"]')) {
      setPaypalReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.paypal.com/sdk/js?client-id=" + (isSandbox ? process.env.NEXT_PUBLIC_PAYPAL_SANDBOX_CLIENT_ID : process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) + "&currency=USD";
    script.async = true;
    script.onload = () => setPaypalReady(true);
    document.body.appendChild(script);
  }, [isSandbox]);

  useEffect(() => {
    if (isOpen && !paypalReady) {
      loadPayPalScript();
    }
  }, [isOpen, paypalReady, loadPayPalScript]);

  const initPayPalButtons = useCallback(async () => {
    if (!paypalReady || typeof window === "undefined" || !paypal) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 创建订单
      const res = await fetch("/api/paypal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedPkg }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // 使用 PayPal SDK 渲染按钮
      paypal
        .Buttons({
          style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },
          createOrder: () => data.orderId,
          onApprove: async () => {
            // 支付成功，调用回调接口发放积分
            const callbackRes = await fetch("/api/paypal/callback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderId, packageId: selectedPkg }),
            });

            const callbackData = await callbackRes.json();
            if (callbackData.success) {
              onSuccess(callbackData.credits);
              onClose();
            } else {
              setError("积分发放失败，请联系客服");
            }
          },
          onError: () => {
            setError("支付失败，请重试");
          },
        })
        .render("#paypal-button-container");
    } catch {
      setError("支付创建失败");
    }

    setLoading(false);
  }, [paypalReady, selectedPkg, onSuccess, onClose]);

  // 当选择套餐变化或 PayPal 就绪时，重新渲染 PayPal 按钮
  useEffect(() => {
    initPayPalButtons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPkg, paypalReady]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-neutral-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-neutral-800" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">充值积分</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isSandbox && (
          <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg text-yellow-400 text-sm">
            ⚠️ 沙盒测试环境
          </div>
        )}

        <div className="space-y-3 mb-6">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPkg(pkg.id)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                selectedPkg === pkg.id
                  ? "border-white bg-white/10"
                  : "border-neutral-800 hover:border-neutral-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-semibold">{pkg.credits} 积分</span>
                  {pkg.popular && (
                    <span className="ml-2 text-xs bg-white text-black px-2 py-0.5 rounded-full font-medium">
                      推荐
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">{pkg.price}</div>
                  <div className="text-neutral-500 text-xs">{pkg.per}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">{error}</div>
        )}

        <div id="paypal-button-container" className="min-h-[44px]" />

        {loading && (
          <div className="flex items-center justify-center gap-2 text-neutral-500 text-sm mt-4">
            <div className="w-4 h-4 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
            加载支付中...
          </div>
        )}

        <p className="text-center text-neutral-600 text-xs mt-4">图片仅在内存中处理，不做任何存储</p>
      </div>
    </div>
  );
}
