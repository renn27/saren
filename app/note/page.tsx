import { db } from "@/lib/db";
import { NoteClient } from "./NoteClient";

export const metadata = {
  title: "Note - SAREN",
};

export default async function NotePage() {
  const [notes, labels] = await Promise.all([
    db.note.findMany({
      include: {
        listItems: {
          orderBy: { urutan: "asc" },
        },
        labels: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.label.findMany({
      orderBy: { name: "asc" },
    })
  ]);

  return <NoteClient initialNotes={notes} initialLabels={labels} />;
}
