/**
 * Remove.bg API Proxy Worker
 * Deploys to: image-bg-remover-api.<account>.workers.dev
 */

const removeBgApiUrl = "https://api.remove.bg/v1.0/removebg";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 只接受 POST /remove-bg
    if (request.method !== "POST" || url.pathname !== "/remove-bg") {
      return new Response("Not Found", { status: 404 });
    }

    const apiKey = env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Remove.bg API Key 未配置" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const formData = await request.formData();
      const imageFile = formData.get("image");

      if (!imageFile || !(imageFile instanceof File)) {
        return new Response(JSON.stringify({ error: "未提供图片" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (imageFile.size > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "文件大小不能超过 10MB" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(imageFile.type)) {
        return new Response(JSON.stringify({ error: "仅支持 JPG / PNG / WebP 格式" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const rbFormData = new FormData();
      rbFormData.append("image_file", imageFile);
      rbFormData.append("size", "auto");
      rbFormData.append("format", "png");

      const rbResponse = await fetch(removeBgApiUrl, {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
        },
        body: rbFormData,
      });

      if (!rbResponse.ok) {
        const errText = await rbResponse.text();
        return new Response(JSON.stringify({ error: `Remove.bg API 错误: ${errText}` }), {
          status: rbResponse.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      const resultBuffer = await rbResponse.arrayBuffer();
      const contentType = rbResponse.headers.get("content-type") || "image/png";

      return new Response(resultBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      console.error("Worker error:", err);
      return new Response(JSON.stringify({ error: "处理图片时发生未知错误，请重试" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
