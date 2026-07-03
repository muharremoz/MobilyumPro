/**
 * SQL Server (Prisma) bağlantı string'i çöz/kur yardımcıları.
 * Format: sqlserver://HOST:PORT;database=DB;user=U;password=P;trustServerCertificate=true;encrypt=true
 */
export type Baglanti = {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
  trustServerCertificate: boolean;
  encrypt: boolean;
};

export const BOS_BAGLANTI: Baglanti = {
  host: "localhost",
  port: "1433",
  database: "mobilyumpro",
  user: "sa",
  password: "",
  trustServerCertificate: true,
  encrypt: true,
};

/** DATABASE_URL string'ini alanlara ayırır. */
export function baglantiCoz(url: string | undefined): Baglanti {
  if (!url) return { ...BOS_BAGLANTI };
  const s = url
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/^sqlserver:\/\//i, "");
  const [hostPort, ...kvs] = s.split(";");
  const [host, port] = hostPort.split(":");
  const map: Record<string, string> = {};
  for (const kv of kvs) {
    const i = kv.indexOf("=");
    if (i > 0) map[kv.slice(0, i).trim().toLowerCase()] = kv.slice(i + 1);
  }
  return {
    host: host || "localhost",
    port: port || "1433",
    database: map["database"] ?? "",
    user: map["user"] ?? map["uid"] ?? "",
    password: map["password"] ?? map["pwd"] ?? "",
    trustServerCertificate:
      (map["trustservercertificate"] ?? "true").toLowerCase() === "true",
    encrypt: (map["encrypt"] ?? "true").toLowerCase() === "true",
  };
}

/** Alanlardan DATABASE_URL string'i üretir. */
export function baglantiUrl(b: Baglanti): string {
  const parcalar = [
    `${b.host}:${b.port || "1433"}`,
    `database=${b.database}`,
    `user=${b.user}`,
    `password=${b.password}`,
    `trustServerCertificate=${b.trustServerCertificate}`,
    `encrypt=${b.encrypt}`,
  ];
  return `sqlserver://${parcalar.join(";")}`;
}
