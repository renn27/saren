import { notFound } from "next/navigation";
import { getAplikasi } from "@/lib/actions/aplikasi";
import { db } from "@/lib/db";
import { AplikasiDetailClient } from "./AplikasiDetailClient";

interface PageProps {
  params: Promise<{
    aplikasiId: string;
  }>;
}

export const metadata = {
  title: "Detail Aplikasi - SAREN",
};

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;

  const [aplikasi, nomorList] = await Promise.all([
    getAplikasi(resolvedParams.aplikasiId),
    db.nomor.findMany({
      orderBy: { provider: "asc" },
    }),
  ]);

  if (!aplikasi || aplikasi.garapanId !== null) {
    notFound();
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-5 sm:px-6 sm:py-8">
      <AplikasiDetailClient aplikasi={aplikasi} nomorList={nomorList} />
    </div>
  );
}
