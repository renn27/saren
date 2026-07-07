import { notFound } from "next/navigation";
import { getGarapan } from "@/lib/actions/garapan";
import { getAplikasiList } from "@/lib/actions/aplikasi";
import { AplikasiListClient } from "./AplikasiListClient";

interface PageProps {
  params: Promise<{
    garapanId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;

  // Fetch garapan info dan list aplikasi secara paralel
  const [garapan, list] = await Promise.all([
    getGarapan(resolvedParams.garapanId),
    getAplikasiList(resolvedParams.garapanId),
  ]);

  if (!garapan) {
    notFound();
  }

  return (
    <div className="max-w-5xl w-full mx-auto px-4 py-5 sm:px-6 sm:py-8">
      <AplikasiListClient garapan={garapan} initialList={list} />
    </div>
  );
}
