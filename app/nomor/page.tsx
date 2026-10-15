import { db } from "@/lib/db";
import { NomorClient } from "./NomorClient";

export const metadata = {
  title: "Nomor - SAREN",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NomorPage() {
  const nomorList = await db.nomor.findMany({
    orderBy: { masaAktif: "asc" },
  });

  return <NomorClient initialData={nomorList} />;
}
