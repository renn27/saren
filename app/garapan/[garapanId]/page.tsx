import { notFound } from "next/navigation";
import { getGarapan } from "@/lib/actions/garapan";
import { getAplikasiList } from "@/lib/actions/aplikasi";
import { AplikasiListClient } from "./AplikasiListClient";

interface PageProps {
  params: Promise<{
    garapanId: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const garapan = await getGarapan(resolvedParams.garapanId);
  if (!garapan) {
    notFound();
  }

  const list = await getAplikasiList(resolvedParams.garapanId);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-3 py-5 sm:px-6 sm:py-8">
      <AplikasiListClient garapan={garapan} initialList={list} />
    </main>
  );
}
