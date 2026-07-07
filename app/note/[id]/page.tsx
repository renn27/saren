import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { NoteEditClient } from "./NoteEditClient";

export const metadata = {
  title: "Edit Catatan - SAREN",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NoteDetailPage({ params }: PageProps) {
  const resolvedParams = await params;

  const [note, labels] = await Promise.all([
    db.note.findUnique({
      where: { id: resolvedParams.id },
      include: {
        listItems: {
          orderBy: { urutan: "asc" },
        },
        labels: true,
      },
    }),
    db.label.findMany({
      orderBy: { name: "asc" },
    })
  ]);

  if (!note) {
    notFound();
  }

  return <NoteEditClient initialNote={note} initialLabels={labels} />;
}
