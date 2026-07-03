import { BaglantiAyarlari } from "@/components/settings/baglanti-ayarlari";
import { baglantiCoz } from "@/lib/db/baglanti";

export default function BaglantiPage() {
  const mevcut = baglantiCoz(process.env.DATABASE_URL);
  const sifreVar = !!mevcut.password;
  // Şifreyi tarayıcıya gönderme — boş bırak, kaydederken korunur.
  return (
    <BaglantiAyarlari
      baglanti={{ ...mevcut, password: "" }}
      sifreVar={sifreVar}
    />
  );
}
