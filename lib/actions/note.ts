"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface NoteListItemInput {
  text: string;
  isCompleted: boolean;
  urutan: number;
}

interface CreateNoteInput {
  title?: string;
  content?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  color?: string;
  isList?: boolean;
  isTable?: boolean;
  listItems?: NoteListItemInput[];
  labelIds?: string[];
}

interface UpdateNoteInput {
  title?: string;
  content?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  isTrashed?: boolean;
  color?: string;
  isList?: boolean;
  isTable?: boolean;
  listItems?: NoteListItemInput[];
  labelIds?: string[];
}

export async function createNote(data: CreateNoteInput) {
  try {
    const note = await db.$transaction(async (tx) => {
      return await tx.note.create({
        data: {
          title: data.title || "",
          content: data.content || "",
          isPinned: data.isPinned ?? false,
          isArchived: data.isArchived ?? false,
          isTrashed: false,
          color: data.color || "default",
          isList: data.isList ?? false,
          isTable: data.isTable ?? false,
          listItems: data.listItems && data.listItems.length > 0
            ? {
                createMany: {
                  data: data.listItems.map((item) => ({
                    text: item.text,
                    isCompleted: item.isCompleted,
                    urutan: item.urutan,
                  })),
                },
              }
            : undefined,
          labels: data.labelIds && data.labelIds.length > 0
            ? {
                connect: data.labelIds.map((id) => ({ id })),
              }
            : undefined,
        },
        include: {
          listItems: true,
          labels: true,
        },
      });
    });

    revalidatePath("/note");
    return { success: true, data: note };
  } catch (error) {
    console.error("Failed to create note:", error);
    return { success: false, error: "Gagal membuat catatan" };
  }
}

export async function updateNote(id: string, data: UpdateNoteInput) {
  try {
    const note = await db.$transaction(async (tx) => {
      // If list items are provided, replace them
      if (data.listItems !== undefined) {
        // delete old items
        await tx.noteListItem.deleteMany({
          where: { noteId: id },
        });
      }

      return await tx.note.update({
        where: { id },
        data: {
          title: data.title !== undefined ? data.title : undefined,
          content: data.content !== undefined ? data.content : undefined,
          isPinned: data.isPinned !== undefined ? data.isPinned : undefined,
          isArchived: data.isArchived !== undefined ? data.isArchived : undefined,
          isTrashed: data.isTrashed !== undefined ? data.isTrashed : undefined,
          color: data.color !== undefined ? data.color : undefined,
          isList: data.isList !== undefined ? data.isList : undefined,
          isTable: data.isTable !== undefined ? data.isTable : undefined,
          listItems: data.listItems !== undefined && data.listItems.length > 0
            ? {
                createMany: {
                  data: data.listItems.map((item) => ({
                    text: item.text,
                    isCompleted: item.isCompleted,
                    urutan: item.urutan,
                  })),
                },
              }
            : undefined,
          labels: data.labelIds !== undefined
            ? {
                set: data.labelIds.map((lid) => ({ id: lid })),
              }
            : undefined,
        },
        include: {
          listItems: true,
          labels: true,
        },
      });
    });

    revalidatePath("/note");
    return { success: true, data: note };
  } catch (error) {
    console.error("Failed to update note:", error);
    return { success: false, error: "Gagal memperbarui catatan" };
  }
}

export async function trashNote(id: string) {
  try {
    const note = await db.note.update({
      where: { id },
      data: {
        isTrashed: true,
        isPinned: false, // Untrash / Trash removes pin state
      },
    });
    revalidatePath("/note");
    return { success: true, data: note };
  } catch (error) {
    console.error("Failed to trash note:", error);
    return { success: false, error: "Gagal membuang catatan" };
  }
}

export async function restoreNote(id: string) {
  try {
    const note = await db.note.update({
      where: { id },
      data: {
        isTrashed: false,
      },
    });
    revalidatePath("/note");
    return { success: true, data: note };
  } catch (error) {
    console.error("Failed to restore note:", error);
    return { success: false, error: "Gagal memulihkan catatan" };
  }
}

export async function deleteNotePermanently(id: string) {
  try {
    await db.note.delete({
      where: { id },
    });
    revalidatePath("/note");
    return { success: true };
  } catch (error) {
    console.error("Failed to permanently delete note:", error);
    return { success: false, error: "Gagal menghapus catatan secara permanen" };
  }
}

export async function emptyTrash() {
  try {
    await db.note.deleteMany({
      where: { isTrashed: true },
    });
    revalidatePath("/note");
    return { success: true };
  } catch (error) {
    console.error("Failed to empty trash:", error);
    return { success: false, error: "Gagal mengosongkan tempat sampah" };
  }
}

export async function togglePinNote(id: string) {
  try {
    const note = await db.note.findUnique({ where: { id } });
    if (!note) return { success: false, error: "Catatan tidak ditemukan" };

    const updated = await db.note.update({
      where: { id },
      data: {
        isPinned: !note.isPinned,
        isArchived: false, // Pinned note is not archived
      },
    });
    revalidatePath("/note");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to toggle pin note:", error);
    return { success: false, error: "Gagal mengubah status sematan" };
  }
}

export async function toggleArchiveNote(id: string) {
  try {
    const note = await db.note.findUnique({ where: { id } });
    if (!note) return { success: false, error: "Catatan tidak ditemukan" };

    const updated = await db.note.update({
      where: { id },
      data: {
        isArchived: !note.isArchived,
        isPinned: false, // Archived note is not pinned
      },
    });
    revalidatePath("/note");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to toggle archive note:", error);
    return { success: false, error: "Gagal mengubah status arsip" };
  }
}

export async function updateNoteColor(id: string, color: string) {
  try {
    const note = await db.note.update({
      where: { id },
      data: { color },
    });
    revalidatePath("/note");
    return { success: true, data: note };
  } catch (error) {
    console.error("Failed to update note color:", error);
    return { success: false, error: "Gagal mengubah warna catatan" };
  }
}

// Label Actions
export async function createLabel(name: string) {
  try {
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: "Nama label tidak boleh kosong" };

    const label = await db.label.create({
      data: { name: cleanName },
    });
    revalidatePath("/note");
    return { success: true, data: label };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "Nama label sudah ada" };
    }
    console.error("Failed to create label:", error);
    return { success: false, error: "Gagal membuat label" };
  }
}

export async function updateLabel(id: string, name: string) {
  try {
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: "Nama label tidak boleh kosong" };

    const label = await db.label.update({
      where: { id },
      data: { name: cleanName },
    });
    revalidatePath("/note");
    return { success: true, data: label };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "Nama label sudah digunakan" };
    }
    console.error("Failed to update label:", error);
    return { success: false, error: "Gagal memperbarui label" };
  }
}

export async function deleteLabel(id: string) {
  try {
    await db.label.delete({
      where: { id },
    });
    revalidatePath("/note");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete label:", error);
    return { success: false, error: "Gagal menghapus label" };
  }
}
