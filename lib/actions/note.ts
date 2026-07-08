"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";

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
  imageUrl?: string | null;
  folderId?: string | null;
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
  imageUrl?: string | null;
  folderId?: string | null;
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
          imageUrl: data.imageUrl || null,
          folderId: data.folderId || null,
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
          imageUrl: data.imageUrl !== undefined ? data.imageUrl : undefined,
          folderId: data.folderId !== undefined ? data.folderId : undefined,
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

export async function duplicateNote(id: string) {
  try {
    const sourceNote = await db.note.findUnique({
      where: { id },
      include: {
        listItems: true,
        labels: true,
      },
    });

    if (!sourceNote) {
      return { success: false, error: "Catatan tidak ditemukan" };
    }

    const newNote = await db.note.create({
      data: {
        title: sourceNote.title ? `${sourceNote.title} (Salinan)` : "Catatan Salinan",
        content: sourceNote.content,
        color: sourceNote.color,
        isPinned: false, // Default copy is not pinned
        isArchived: false,
        isTrashed: false,
        isList: sourceNote.isList,
        isTable: sourceNote.isTable,
        imageUrl: sourceNote.imageUrl,
        folderId: sourceNote.folderId,
        listItems: sourceNote.listItems.length > 0
          ? {
              createMany: {
                data: sourceNote.listItems.map((item) => ({
                  text: item.text,
                  isCompleted: item.isCompleted,
                  urutan: item.urutan,
                })),
              },
            }
          : undefined,
        labels: sourceNote.labels.length > 0
          ? {
              connect: sourceNote.labels.map((l) => ({ id: l.id })),
            }
          : undefined,
      },
      include: {
        listItems: true,
        labels: true,
      },
    });

    revalidatePath("/note");
    return { success: true, data: newNote };
  } catch (error) {
    console.error("Failed to duplicate note:", error);
    return { success: false, error: "Gagal menduplikasi catatan" };
  }
}

export async function uploadNoteImage(id: string, formData: FormData) {
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Tidak ada file yang dipilih" };
  }

  try {
    const existing = await db.note.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Catatan tidak ditemukan" };
    }

    // Delete old image
    if (existing.imageUrl && process.env.BLOB_READ_WRITE_TOKEN && existing.imageUrl.includes("public.blob.vercel-storage.com")) {
      try {
        await del(existing.imageUrl);
      } catch (e) {
        console.error("Failed to delete old blob:", e);
      }
    }

    let imageUrl = "";
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn("BLOB_READ_WRITE_TOKEN is missing. Using fallback mockup image.");
      imageUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60";
    } else {
      const blob = await put(`notes/${id}/${Date.now()}-${file.name}`, file, {
        access: "public",
      });
      imageUrl = blob.url;
    }

    const note = await db.note.update({
      where: { id },
      data: { imageUrl },
    });

    revalidatePath("/note");
    return { success: true, data: note };
  } catch (error: any) {
    console.error("Failed to upload note image:", error);
    return { success: false, error: `Gagal mengupload gambar: ${error?.message || error}` };
  }
}

export async function deleteNoteImage(id: string) {
  try {
    const existing = await db.note.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Catatan tidak ditemukan" };

    if (existing.imageUrl && process.env.BLOB_READ_WRITE_TOKEN && existing.imageUrl.includes("public.blob.vercel-storage.com")) {
      try {
        await del(existing.imageUrl);
      } catch (e) {
        console.error("Failed to delete blob:", e);
      }
    }

    const note = await db.note.update({
      where: { id },
      data: { imageUrl: null },
    });

    revalidatePath("/note");
    return { success: true, data: note };
  } catch (error: any) {
    console.error("Failed to delete note image:", error);
    return { success: false, error: "Gagal menghapus gambar" };
  }
}

export async function fetchLinkMetadata(url: string) {
  try {
    // Basic validation
    const parsedUrl = new URL(url);
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      next: { revalidate: 3600 }, // Cache on Next.js server for 1 hour
    });
    if (!response.ok) return null;

    const html = await response.text();

    // Extract title (og:title or <title>)
    let title = "";
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    if (ogTitleMatch) {
      title = ogTitleMatch[1];
    } else {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) title = titleMatch[1];
    }

    // Extract description (og:description or description)
    let description = "";
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
    if (ogDescMatch) {
      description = ogDescMatch[1];
    } else {
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
      if (descMatch) description = descMatch[1];
    }

    // Extract image (og:image)
    let image = "";
    const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImgMatch) image = ogImgMatch[1];

    const unescape = (str: string) => {
      return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x2F;/g, "/");
    };

    const cleanTitle = title ? unescape(title.trim()) : "";
    const cleanDescription = description ? unescape(description.trim()) : "";
    let cleanImage = image ? image.trim() : "";

    // Resolve relative image URLs if necessary
    if (cleanImage && !cleanImage.startsWith("http") && !cleanImage.startsWith("//")) {
      try {
        cleanImage = new URL(cleanImage, parsedUrl.origin).toString();
      } catch {
        cleanImage = "";
      }
    } else if (cleanImage && cleanImage.startsWith("//")) {
      cleanImage = parsedUrl.protocol + cleanImage;
    }

    return {
      url,
      title: cleanTitle || parsedUrl.hostname,
      description: cleanDescription || "",
      image: cleanImage || null,
    };
  } catch (error) {
    console.error("fetchLinkMetadata error:", error);
    return null;
  }
}

export async function getFolders() {
  try {
    const folders = await db.folder.findMany({
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
    });
    return { success: true, data: folders };
  } catch (error) {
    console.error("Failed to get folders:", error);
    return { success: false, error: "Gagal mengambil daftar folder" };
  }
}

export async function createFolder(name: string) {
  try {
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: "Nama folder tidak boleh kosong" };

    const folder = await db.folder.create({
      data: { name: cleanName },
    });
    revalidatePath("/note");
    return { success: true, data: folder };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "Nama folder sudah digunakan" };
    }
    console.error("Failed to create folder:", error);
    return { success: false, error: "Gagal membuat folder" };
  }
}

export async function renameFolder(id: string, name: string) {
  try {
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: "Nama folder tidak boleh kosong" };

    const folder = await db.folder.update({
      where: { id },
      data: { name: cleanName },
    });
    revalidatePath("/note");
    return { success: true, data: folder };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "Nama folder sudah digunakan" };
    }
    console.error("Failed to rename folder:", error);
    return { success: false, error: "Gagal mengubah nama folder" };
  }
}

export async function deleteFolder(id: string) {
  try {
    await db.folder.delete({
      where: { id },
    });
    revalidatePath("/note");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete folder:", error);
    return { success: false, error: "Gagal menghapus folder" };
  }
}

export async function assignNoteToFolder(noteId: string, folderId: string | null) {
  try {
    const note = await db.note.update({
      where: { id: noteId },
      data: { folderId },
    });
    revalidatePath("/note");
    return { success: true, data: note };
  } catch (error) {
    console.error("Failed to assign note to folder:", error);
    return { success: false, error: "Gagal memindahkan catatan" };
  }
}
