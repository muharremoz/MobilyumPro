"use client";

import * as React from "react";
import { Database, Eye, EyeOff, Plug, Save, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Baglanti } from "@/lib/db/baglanti";
import { baglantiTest, baglantiKaydet } from "@/lib/db/baglanti-actions";

export function BaglantiAyarlari({
  baglanti,
  sifreVar,
}: {
  baglanti: Baglanti;
  sifreVar: boolean;
}) {
  const [form, setForm] = React.useState<Baglanti>(baglanti);
  const [sifreGoster, setSifreGoster] = React.useState(false);
  const [testEdiliyor, setTestEdiliyor] = React.useState(false);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  const set =
    (k: keyof Baglanti) =>
    (v: string | boolean) =>
      setForm((f) => ({ ...f, [k]: v }));

  async function test() {
    setTestEdiliyor(true);
    const res = await baglantiTest(form);
    setTestEdiliyor(false);
    if (res.ok) {
      toast.success(res.surum ? `Bağlantı başarılı — ${res.surum}` : "Bağlantı başarılı");
    } else {
      toast.error(res.error ?? "Bağlanılamadı.");
    }
  }

  async function kaydet() {
    setKaydediliyor(true);
    const res = await baglantiKaydet(form);
    setKaydediliyor(false);
    if (res.ok) {
      toast.success(
        "Bağlantı kaydedildi. Etkili olması için uygulamayı yeniden başlatın.",
      );
    } else {
      toast.error(res.error ?? "Kaydedilemedi.");
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="size-4" /> Bağlantı Bilgileri
        </CardTitle>
        <CardDescription>
          Uygulamanın bağlanacağı SQL Server bilgileri. Değişiklik{" "}
          <code>.env</code> dosyasına yazılır; etkili olması için uygulama
          yeniden başlatılmalıdır.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="host">Sunucu (Host)</Label>
            <Input
              id="host"
              value={form.host}
              onChange={(e) => set("host")(e.target.value)}
              placeholder="localhost veya 192.168.1.10"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              value={form.port}
              onChange={(e) => set("port")(e.target.value)}
              placeholder="1433"
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="database">Veritabanı</Label>
          <Input
            id="database"
            value={form.database}
            onChange={(e) => set("database")(e.target.value)}
            placeholder="mobilyumpro"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="user">Kullanıcı</Label>
            <Input
              id="user"
              value={form.user}
              onChange={(e) => set("user")(e.target.value)}
              placeholder="sa"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Şifre</Label>
            <div className="relative">
              <Input
                id="password"
                type={sifreGoster ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password")(e.target.value)}
                placeholder={
                  sifreVar ? "(değiştirmek için doldur)" : "SQL Server şifresi"
                }
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setSifreGoster((s) => !s)}
                aria-label={sifreGoster ? "Şifreyi gizle" : "Şifreyi göster"}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {sifreGoster ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {sifreVar && (
              <p className="text-[11px] text-muted-foreground">
                Boş bırakılırsa mevcut şifre korunur.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-md border p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm">
              Sertifikaya güven{" "}
              <span className="text-muted-foreground">
                (trustServerCertificate)
              </span>
            </span>
            <Switch
              checked={form.trustServerCertificate}
              onCheckedChange={(v) => set("trustServerCertificate")(v === true)}
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm">
              Şifreli bağlantı{" "}
              <span className="text-muted-foreground">(encrypt)</span>
            </span>
            <Switch
              checked={form.encrypt}
              onCheckedChange={(v) => set("encrypt")(v === true)}
            />
          </label>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[12px] text-amber-800">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Şifre dahil bilgiler sunucudaki <code>.env</code> dosyasına yazılır
            (git&apos;e girmez). Kaydettikten sonra <b>uygulamayı yeniden
            başlatın</b>; aksi halde eski bağlantı kullanılmaya devam eder.
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={test} disabled={testEdiliyor}>
            <Plug className="size-4" /> {testEdiliyor ? "Test ediliyor…" : "Test Et"}
          </Button>
          <Button onClick={kaydet} disabled={kaydediliyor}>
            <Save className="size-4" /> {kaydediliyor ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
