import { notFound } from "next/navigation";
import { getGarapan } from "@/lib/actions/garapan";
import { getAplikasiList, getStandaloneAplikasiList } from "@/lib/actions/aplikasi";
import { AplikasiListClient } from "./AplikasiListClient";

interface PageProps {
  params: Promise<{
    garapanId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;

  // Fetch garapan info lebih dulu (mendukung CUID maupun nama/angka bulan slug)
  const garapan = await getGarapan(resolvedParams.garapanId);

  if (!garapan) {
    notFound();
  }

  // Fetch list aplikasi untuk garapan ini dan list standalone secara paralel
  const [list, standaloneList] = await Promise.all([
    getAplikasiList(garapan.id),
    getStandaloneAplikasiList(),
  ]);

  return (
    <div className="max-w-5xl w-full mx-auto px-4 py-5 sm:px-6 sm:py-8">
      <AplikasiListClient garapan={garapan} initialList={list} standaloneList={standaloneList} />
    </div>
  );
}
