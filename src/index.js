/**
 * 图片背景移除 Worker
 * - GET /: 返回上传页面
 * - POST /: 接收图片，调用 Remove.bg，返回结果
 */

const HTML = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>图片背景移除</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    min-height: 100vh;
    background: #0f0f0f;
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  h1 { font-size: 1.8rem; font-weight: 600; margin-bottom: 0.5rem; }
  .subtitle { color: #888; margin-bottom: 2rem; font-size: 0.9rem; }
  .drop-zone {
    width: 100%;
    max-width: 480px;
    border: 2px dashed #333;
    border-radius: 16px;
    padding: 3rem 2rem;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    background: #1a1a1a;
  }
  .drop-zone:hover, .drop-zone.dragover {
    border-color: #666;
    background: #222;
  }
  .drop-zone p { color: #666; font-size: 0.95rem; line-height: 1.6; }
  .drop-zone .hint { font-size: 0.8rem; color: #444; margin-top: 0.5rem; }
  .drop-zone input { display: none; }
  .preview-wrap {
    display: none;
    width: 100%;
    max-width: 640px;
    margin-top: 2rem;
    gap: 1rem;
    justify-content: center;
  }
  .preview-wrap.show { display: flex; }
  .preview-box { text-align: center; }
  .preview-box img {
    max-width: 280px;
    max-height: 280px;
    border-radius: 8px;
    border: 1px solid #333;
  }
  .preview-box span { display: block; margin-top: 0.5rem; font-size: 0.8rem; color: #666; }
  .loading {
    display: none;
    margin-top: 1.5rem;
    color: #888;
    font-size: 0.9rem;
  }
  .loading.show { display: block; }
  .spinner {
    width: 20px; height: 20px;
    border: 2px solid #333;
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 0.75rem;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .download-btn {
    display: none;
    margin-top: 1.5rem;
    padding: 0.75rem 2rem;
    background: #fff;
    color: #000;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
  }
  .download-btn.show { display: inline-block; }
  .error { color: #ff6b6b; margin-top: 1rem; font-size: 0.85rem; display: none; }
  .error.show { display: block; }
  footer { margin-top: 3rem; font-size: 0.75rem; color: #333; }
</style>
</head>
<body>
  <h1>🖼️ 图片背景移除</h1>
  <p class="subtitle">Remove.bg · Cloudflare Workers</p>

  <div class="drop-zone" id="dropZone">
    <p>拖拽图片到这里<br>或点击选择文件</p>
    <span class="hint">支持 JPG / PNG / WebP，最大 10MB</span>
    <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp">
  </div>

  <div class="loading" id="loading">
    <div class="spinner"></div>
    正在移除背景…
  </div>

  <div class="error" id="error"></div>

  <div class="preview-wrap" id="previewWrap">
    <div class="preview-box">
      <img id="previewOrig" alt="原图">
      <span>原图</span>
    </div>
    <div class="preview-box">
      <img id="previewResult" alt="结果">
      <span>已移除背景</span>
    </div>
  </div>

  <a class="download-btn" id="downloadBtn" download="removed-bg.png">下载 PNG</a>

  <footer>图片仅在内存中处理，不做任何存储</footer>

  <script>
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const previewWrap = document.getElementById('previewWrap');
    const previewOrig = document.getElementById('previewOrig');
    const previewResult = document.getElementById('previewResult');
    const downloadBtn = document.getElementById('downloadBtn');

    let lastResultData = null;

    function reset() {
      loading.classList.remove('show');
      error.classList.remove('show');
      previewWrap.classList.remove('show');
      downloadBtn.classList.remove('show');
      lastResultData = null;
    }

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const f = e.dataTransfer.files[0];
      if (f) processFile(f);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) processFile(fileInput.files[0]);
    });

    function readFile(f) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
    }

    async function processFile(file) {
      reset();
      if (!file.type.startsWith('image/')) {
        showError('请选择图片文件');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showError('文件大小不能超过 10MB');
        return;
      }

      // 显示原图预览
      const dataUrl = await readFile(file);
      previewOrig.src = dataUrl;
      loading.classList.add('show');
      error.classList.remove('show');

      try {
        // 上传到 Worker 处理
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch('/', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || \`错误 \${res.status}\`);
        }

        const blob = await res.blob();
        lastResultData = blob;

        const resultUrl = URL.createObjectURL(blob);
        previewResult.src = resultUrl;
        previewWrap.classList.add('show');
        downloadBtn.href = resultUrl;
        downloadBtn.classList.add('show');
      } catch (err) {
        showError(err.message || '处理失败，请重试');
      } finally {
        loading.classList.remove('show');
      }
    }

    function showError(msg) {
      error.textContent = msg;
      error.classList.add('show');
    }
  </script>
</body>
</html>`;

async function handleRequest(request) {
  const url = new URL(request.url);

  // GET - 返回页面
  if (request.method === 'GET') {
    return new Response(HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // POST - 处理图片
  if (request.method === 'POST') {
    const apiKey = REMOVE_BG_API_KEY;
    if (!apiKey) {
      return new Response('REMOVE_BG_API_KEY not configured', { status: 500 });
    }

    try {
      const formData = await request.formData();
      const imageFile = formData.get('image');

      if (!imageFile) {
        return new Response('No image provided', { status: 400 });
      }

      // 调用 Remove.bg API
      const removeBgForm = new FormData();
      removeBgForm.append('image_file', imageFile);
      removeBgForm.append('size', 'auto');
      removeBgForm.append('format', 'png');

      const rbResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
        },
        body: removeBgForm,
      });

      if (!rbResponse.ok) {
        const errText = await rbResponse.text();
        return new Response(`Remove.bg API error: ${errText}`, { status: rbResponse.status });
      }

      const resultBlob = await rbResponse.blob();

      return new Response(resultBlob, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-store',
        },
      });
    } catch (err) {
      return new Response(`Processing error: ${err.message}`, { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}

export default {
  fetch(request, env, ctx) {
    // 注入 env 到全局供 handleRequest 使用
    globalThis.REMOVE_BG_API_KEY = env.REMOVE_BG_API_KEY || '';
    return handleRequest(request);
  },
};
