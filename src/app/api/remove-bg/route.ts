import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.REMOVE_BG_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Remove.bg API Key 未配置" },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "未提供图片" },
        { status: 400 }
      );
    }

    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "文件大小不能超过 10MB" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: "仅支持 JPG / PNG / WebP 格式" },
        { status: 400 }
      );
    }

    // 构造发给 Remove.bg 的 FormData
    const rbFormData = new FormData();
    rbFormData.append("image_file", imageFile);
    rbFormData.append("size", "auto");
    rbFormData.append("format", "png");

    const rbResponse = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
      },
      body: rbFormData,
    });

    if (!rbResponse.ok) {
      const errText = await rbResponse.text();
      return NextResponse.json(
        { error: `Remove.bg API 错误: ${errText}` },
        { status: rbResponse.status }
      );
    }

    const resultBuffer = await rbResponse.arrayBuffer();
    const contentType = rbResponse.headers.get("content-type") || "image/png";

    return new NextResponse(resultBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Remove-bg API error:", err);
    return NextResponse.json(
      { error: "处理图片时发生未知错误，请重试" },
      { status: 500 }
    );
  }
}
