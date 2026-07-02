import { cn } from "@/lib/utils";

/**
 * Login sağ panelindeki "Neler yeni?" akışı.
 * Şimdilik mock veri — ileride gerçek bir güncelleme kaynağına bağlanacak
 * (alt yapı bilinçli olarak kurulmadı).
 */
type Guncelleme = {
  tarih: string;
  baslik: string;
  aciklama: string;
};

const guncellemeler: Guncelleme[] = [
  {
    tarih: "02 Temmuz 2026",
    baslik: "Giriş ekranı yenilendi",
    aciklama:
      "Veritabanı seçimi, aranabilir liste ve modern doğrulama uyarılarıyla yeni giriş deneyimi.",
  },
  {
    tarih: "28 Haziran 2026",
    baslik: "Stok yönetimi hızlandı",
    aciklama:
      "Malzeme ve parça listeleri artık daha hızlı yükleniyor; filtreler anında uygulanıyor.",
  },
  {
    tarih: "21 Haziran 2026",
    baslik: "Üretim emri termin hatası giderildi",
    aciklama:
      "Termin tarihi boş bırakılan emirlerin listede hatalı sıralanması düzeltildi.",
  },
];

export function LoginUpdates({ className }: { className?: string }) {
  return (
    <div className={cn("w-full max-w-sm", className)}>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Güncellemeler
      </p>
      <h2 className="mt-1 text-xl font-semibold text-foreground">Neler yeni?</h2>

      <ul className="mt-5 flex flex-col gap-3">
        {guncellemeler.map((g) => (
          <li
            key={g.baslik}
            className="rounded-xl border border-border/60 bg-white/70 p-4 shadow-xs backdrop-blur-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{g.baslik}</p>
              <time className="shrink-0 text-xs text-muted-foreground">
                {g.tarih}
              </time>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {g.aciklama}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
