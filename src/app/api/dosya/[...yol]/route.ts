import { NextResponse, type NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** uploads/ altındaki dosyaları servis eder (yol güvenliği ile). */
const KOK = path.join(process.cwd(), "uploads");

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ yol: string[] }> },
) {
  const { yol } = await params;
  const gorece = yol.map((p) => decodeURIComponent(p)).join("/");
  const tam = path.normalize(path.join(KOK, gorece));
  // Yol kaçışı (..) engeli — uploads dışına çıkılamaz.
  if (!tam.startsWith(KOK + path.sep))
    return new NextResponse("Yasak", { status: 403 });
  try {
    const veri = await readFile(tam);
    const tip = MIME[path.extname(tam).toLowerCase()] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(veri), {
      headers: {
        "Content-Type": tip,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Bulunamadı", { status: 404 });
  }
}
