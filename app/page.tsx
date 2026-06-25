import { getGarapanList } from "@/lib/actions/garapan";
import { GarapanListClient } from "./GarapanListClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const list = await getGarapanList();

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-3 py-5 sm:px-6 sm:py-8">
      <GarapanListClient initialList={list} />
    </main>
  );
}
