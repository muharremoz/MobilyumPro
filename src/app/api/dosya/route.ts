import { NextResponse, type NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Dosya yükleme (multipart form: dosya + klasor).
 * Dosyalar proje kökündeki uploads/ altına yazılır (git'e girmez);
 * geri servis /api/dosya/[...yol] üzerinden yapılır.
 */
const KOK = path.join(process.cwd(), "uploads");
const MAKS_BOYUT = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const dosya = form.get("dosya");
  const klasor = String(form.get("klasor") ?? "genel").replace(
    /[^a-zA-Z0-9_-]/g,
    "",
  );
  if (!(dosya instanceof File) || dosya.size === 0)
    return NextResponse.json({ error: "Dosya seçilmedi." }, { status: 400 });
  if (dosya.size > MAKS_BOYUT)
    return NextResponse.json(
      { error: "Dosya 20 MB'den büyük olamaz." },
      { status: 400 },
    );

  // Güvenli dosya adı: zaman damgası + sadeleştirilmiş orijinal ad.
  const uzanti = path
    .extname(dosya.name)
    .toLowerCase()
    .replace(/[^.a-z0-9]/g, "");
  const govde =
    path
      .basename(dosya.name, path.extname(dosya.name))
      .replace(/[^\p{L}\p{N}_. -]/gu, "")
      .trim()
      .slice(0, 80) || "dosya";
  const dosyaAdi = `${Date.now()}-${govde}${uzanti}`;

  const hedefKlasor = path.join(KOK, klasor || "genel");
  await mkdir(hedefKlasor, { recursive: true });
  await writeFile(
    path.join(hedefKlasor, dosyaAdi),
    Buffer.from(await dosya.arrayBuffer()),
  );

  return NextResponse.json({
    ok: true,
    url: `/api/dosya/${klasor || "genel"}/${encodeURIComponent(dosyaAdi)}`,
    ad: govde,
  });
}
