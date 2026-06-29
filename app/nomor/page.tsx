import { db } from "@/lib/db";
import { NomorClient } from "./NomorClient";

export const metadata = {
  title: "Nomor - SAREN",
};

export default async function NomorPage() {
  const nomorList = await db.nomor.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <NomorClient initialData={nomorList} />;
}
