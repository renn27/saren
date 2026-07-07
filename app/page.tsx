import { getGarapanList } from "@/lib/actions/garapan";
import { GarapanListClient } from "./GarapanListClient";

export default async function Page() {
  const list = await getGarapanList();

  return (
    <div className="max-w-5xl w-full mx-auto px-4 py-5 sm:px-6 sm:py-8">
      <GarapanListClient initialList={list} />
    </div>
  );
}
