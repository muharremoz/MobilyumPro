import { notFound } from "next/navigation";
import Image from "next/image";

import { getAtolyeGorunumu } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * QR ile açılan atölye görünümü — panel layout'u DIŞINDA, login gerektirmez.
 * Kod biçimi: "<parcaId>" veya "<parcaId>.<emirId>" (refakat kağıdındaki QR).
 * Tezgahtaki personel telefonla okutup teknik resim/doküman görür.
 */

const mm = (v?: number) =>
  v == null ? "—" : v.toLocaleString("tr-TR", { maximumFractionDigits: 1 });

const resimMi = (url: string) => /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(url);

export default async function AtolyeRoute({
  params,
}: {
  params: Promise<{ kod: string }>;
}) {
  const { kod } = await params;
  const [parcaId, emirId] = decodeURIComponent(kod).split(".");
  const g = await getAtolyeGorunumu(parcaId, emirId);
  if (!g) notFound();

  const resimler = g.dokumanlar.filter((d) => resimMi(d.url));
  const dosyalar = g.dokumanlar.filter((d) => !resimMi(d.url));

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-4 bg-background p-4">
      {/* Künye */}
      <header className="rounded-md border bg-card p-4">
        <p className="text-xs text-muted-foreground">
          {g.modelAd ?? "Parça"}
          {g.emirId && (
            <>
              {" · "}
              <span className="font-mono">{g.emirId}</span>
              {g.emirAdet ? ` · ${g.emirAdet} adet` : ""}
              {g.emirDurum ? ` · ${g.emirDurum}` : ""}
            </>
          )}
        </p>
        <h1 className="mt-0.5 text-xl font-semibold">{g.parcaAd}</h1>
        <p className="font-mono text-xs text-muted-foreground">{g.parcaId}</p>
      </header>

      {/* Ölçüler */}
      <section className="rounded-md border bg-card p-4">
        <h2 className="text-sm font-semibold">Ölçüler (mm)</h2>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <Olcu
            etiket="Net Kesim"
            deger={`${mm(g.olculer?.netUzunluk)} × ${mm(g.olculer?.netGenislik)}`}
          />
          <Olcu
            etiket="Bitmiş"
            deger={`${mm(g.olculer?.bitmisUzunluk)} × ${mm(g.olculer?.bitmisGenislik)}`}
          />
          <Olcu
            etiket="Kaba Kesim"
            deger={`${mm(g.olculer?.kabaUzunluk)} × ${mm(g.olculer?.kabaGenislik)}`}
          />
          <Olcu etiket="Kalınlık" deger={mm(g.olculer?.kalinlik)} />
        </div>
      </section>

      {/* Teknik resimler / görseller */}
      {resimler.length > 0 && (
        <section className="rounded-md border bg-card p-4">
          <h2 className="text-sm font-semibold">
            Görseller & Teknik Resimler
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {resimler.map((d) => (
              <a
                key={d.url}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-1"
              >
                <Image
                  src={d.url}
                  alt={d.ad}
                  width={640}
                  height={480}
                  unoptimized
                  className="w-full rounded-md border object-contain"
                />
                <span className="text-xs text-muted-foreground">
                  {d.ad} · {d.tip} · {d.kaynak}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* PDF / diğer dosyalar */}
      {dosyalar.length > 0 && (
        <section className="rounded-md border bg-card p-4">
          <h2 className="text-sm font-semibold">Dokümanlar</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {dosyalar.map((d) => (
              <li key={d.url}>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline underline-offset-2"
                >
                  {d.ad}
                </a>
                <span className="ml-2 text-xs text-muted-foreground">
                  {d.tip} · {d.kaynak}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Malzemeler */}
      {g.malzemeler.length > 0 && (
        <section className="rounded-md border bg-card p-4">
          <h2 className="text-sm font-semibold">Malzemeler</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {g.malzemeler.map((m) => (
              <li
                key={m.ad}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0">{m.ad}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {m.miktar.toLocaleString("tr-TR", {
                    maximumFractionDigits: 3,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Koli dökümü — paketleme personeli için */}
      {g.paketler && g.paketler.length > 0 && (
        <section className="rounded-md border bg-card p-4">
          <h2 className="text-sm font-semibold">
            Paketleme · {g.paketler.length} koli
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            {g.paketler.map((k) => (
              <div key={k.sira} className="rounded-md border p-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary text-[11px] font-semibold text-primary-foreground tabular-nums">
                    {k.sira}
                  </span>
                  <span className="text-sm font-medium">
                    {k.ad ?? `Paket ${k.sira}`}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {[
                      k.genislik && k.uzunluk
                        ? `${mm(k.genislik)}×${mm(k.uzunluk)}${
                            k.yukseklik ? `×${mm(k.yukseklik)}` : ""
                          } ${k.olcuBirimi ?? "mm"}`
                        : null,
                      k.agirlik
                        ? `${k.agirlik} ${k.agirlikBirimi ?? "kg"}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                {k.icerik.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {k.icerik.map((c, idx) => (
                      <li
                        key={idx}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0">
                          <span
                            className={
                              c.tip === "poset"
                                ? "mr-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700"
                                : c.tip === "malzeme"
                                  ? "mr-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700"
                                  : "mr-1.5 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700"
                            }
                          >
                            {c.tip === "poset"
                              ? "Poşet"
                              : c.tip === "malzeme"
                                ? "Malzeme"
                                : "Parça"}
                          </span>
                          {c.ad}
                        </span>
                        <span className="shrink-0 text-muted-foreground tabular-nums">
                          {c.miktar.toLocaleString("tr-TR", {
                            maximumFractionDigits: 3,
                          })}
                          {c.birim ? ` ${c.birim}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* İşlem sırası */}
      <section className="rounded-md border bg-card p-4">
        <h2 className="text-sm font-semibold">İşlem Sırası</h2>
        {g.islemler.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Bu parça için işlem sırası tanımlı değil.
          </p>
        ) : (
          <ol className="mt-2 flex flex-col gap-1.5">
            {g.islemler.map((i) => (
              <li key={i.sira} className="flex items-baseline gap-2 text-sm">
                <span className="w-5 shrink-0 text-muted-foreground tabular-nums">
                  {i.sira}
                </span>
                <span className="font-medium">{i.istasyonAd}</span>
                {i.makineAd && (
                  <span className="text-muted-foreground">{i.makineAd}</span>
                )}
                <span className="ml-auto text-right text-muted-foreground">
                  {i.operasyon}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="pb-4 text-center text-xs text-muted-foreground">
        MobilyumPro · atölye görünümü
      </p>
    </div>
  );
}

function Olcu({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
        {etiket}
      </div>
      <div className="font-medium tabular-nums">{deger}</div>
    </div>
  );
}
