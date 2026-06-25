import { notFound } from "next/navigation";
import { getGarapan } from "@/lib/actions/garapan";
import { getAplikasi } from "@/lib/actions/aplikasi";
import { AplikasiDetailClient } from "./AplikasiDetailClient";

interface PageProps {
  params: Promise<{
    garapanId: string;
    aplikasiId: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const garapan = await getGarapan(resolvedParams.garapanId);
  const aplikasi = await getAplikasi(resolvedParams.aplikasiId);

  if (!garapan || !aplikasi || aplikasi.garapanId !== garapan.id) {
    notFound();
  }

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto px-3 py-5 sm:px-6 sm:py-8">
      <AplikasiDetailClient garapan={garapan} aplikasi={aplikasi} />
    </main>
  );
}
