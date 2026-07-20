import { redirect } from "next/navigation";

/**
 * `/ayarlar` işlevsel bir landing değil — eskiden "(Demo)" mağaza bilgileri
 * ekranıydı; "Kaydet" hiçbir şey yapmıyordu ve işlevsel karşılığı zaten
 * Sistem Parametreleri sayfası. Boş bir demo tutmaktansa oraya yönlendiriyoruz
 * (ayarlar modülünün gerçek giriş noktası orası).
 */
export default function AyarlarPage() {
  redirect("/ayarlar/parametreler");
}
