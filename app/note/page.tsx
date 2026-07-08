import { db } from "@/lib/db";
import { NoteClient } from "./NoteClient";

export const metadata = {
  title: "Note - SAREN",
};

export default async function NotePage() {
  const [notes, labels, folders] = await Promise.all([
    db.note.findMany({
      include: {
        listItems: {
          orderBy: { urutan: "asc" },
        },
        labels: true,
        folder: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.label.findMany({
      orderBy: { name: "asc" },
    }),
    db.folder.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            notes: {
              where: { isTrashed: false, isArchived: false }
            }
          }
        }
      }
    })
  ]);

  return <NoteClient initialNotes={notes} initialLabels={labels} initialFolders={folders} />;
}
