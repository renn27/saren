import { getStandaloneAplikasiList } from "@/lib/actions/aplikasi";
import { AplikasiListClient } from "./AplikasiListClient";

export const metadata = {
  title: "Daftar Aplikasi - SAREN",
};

export default async function Page() {
  const list = await getStandaloneAplikasiList();

  return (
    <div className="max-w-5xl w-full mx-auto px-4 py-5 sm:px-6 sm:py-8">
      <AplikasiListClient initialList={list} />
    </div>
  );
}
