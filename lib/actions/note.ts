"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// ── Zod schemas ──────────────────────────────────────────────────────────────

const noteListItemSchema = z.object({
  text: z.string(),
  isCompleted: z.boolean(),
  urutan: z.number().int(),
});

const createNoteSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  color: z.string().optional(),
  isList: z.boolean().optional(),
  isTable: z.boolean().optional(),
  listItems: z.array(noteListItemSchema).optional(),
  labelIds: z.array(z.string()).optional(),
  imageUrl: z.string().nullable().optional(),
  folderId: z.string().nullable().optional(),
  reminderAt: z.union([z.date(), z.string()]).nullable().optional(),
  reminderMinutesBefore: z.number().int().optional(),
});

const updateNoteSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isTrashed: z.boolean().optional(),
  color: z.string().optional(),
  isList: z.boolean().optional(),
  isTable: z.boolean().optional(),
  listItems: z.array(noteListItemSchema).optional(),
  labelIds: z.array(z.string()).optional(),
  imageUrl: z.string().nullable().optional(),
  folderId: z.string().nullable().optional(),
  reminderAt: z.union([z.date(), z.string()]).nullable().optional(),
  reminderMinutesBefore: z.number().int().optional(),
});

type CreateNoteInput = z.infer<typeof createNoteSchema>;
type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

// ── SSRF: blokir IP internal / private ───────────────────────────────────────

const PRIVATE_HOST_PATTERN =
  /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/;

function isSsrfSafeUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (PRIVATE_HOST_PATTERN.test(host)) return false;
  // Hanya izinkan HTTP dan HTTPS
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return true;
}

// ── Note CRUD ─────────────────────────────────────────────────────────────────

export async function createNote(data: CreateNoteInput) {
  const validation = createNoteSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

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
          reminderAt: data.reminderAt ? new Date(data.reminderAt) : null,
          reminderMinutesBefore: data.reminderMinutesBefore ?? 0,
          reminderSent: false,
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
  const validation = updateNoteSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  try {
    const note = await db.$transaction(async (tx) => {
      // If list items are provided, replace them
      if (data.listItems !== undefined) {
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
          reminderAt:
            data.reminderAt !== undefined
              ? data.reminderAt
                ? new Date(data.reminderAt)
                : null
              : undefined,
          reminderMinutesBefore:
            data.reminderMinutesBefore !== undefined
              ? data.reminderMinutesBefore
              : undefined,
          reminderSent: data.reminderAt !== undefined ? false : undefined,
          listItems:
            data.listItems !== undefined && data.listItems.length > 0
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
          labels:
            data.labelIds !== undefined
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
        isPinned: false,
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

// ── Toggle pin — atomic transaction (satu round-trip) ─────────────────────────

export async function togglePinNote(id: string) {
  try {
    const updated = await db.$transaction(async (tx) => {
      const note = await tx.note.findUnique({
        where: { id },
        select: { isPinned: true },
      });
      if (!note) throw new Error("NOT_FOUND");
      return tx.note.update({
        where: { id },
        data: {
          isPinned: !note.isPinned,
          isArchived: false,
        },
      });
    });
    revalidatePath("/note");
    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { success: false, error: "Catatan tidak ditemukan" };
    }
    console.error("Failed to toggle pin note:", error);
    return { success: false, error: "Gagal mengubah status sematan" };
  }
}

// ── Toggle archive — atomic transaction ───────────────────────────────────────

export async function toggleArchiveNote(id: string) {
  try {
    const updated = await db.$transaction(async (tx) => {
      const note = await tx.note.findUnique({
        where: { id },
        select: { isArchived: true },
      });
      if (!note) throw new Error("NOT_FOUND");
      return tx.note.update({
        where: { id },
        data: {
          isArchived: !note.isArchived,
          isPinned: false,
        },
      });
    });
    revalidatePath("/note");
    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { success: false, error: "Catatan tidak ditemukan" };
    }
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

// ── Label Actions ─────────────────────────────────────────────────────────────

export async function createLabel(name: string) {
  try {
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: "Nama label tidak boleh kosong" };

    const label = await db.label.create({
      data: { name: cleanName },
    });
    revalidatePath("/note");
    return { success: true, data: label };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
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
        isPinned: false,
        isArchived: false,
        isTrashed: false,
        isList: sourceNote.isList,
        isTable: sourceNote.isTable,
        imageUrl: sourceNote.imageUrl,
        folderId: sourceNote.folderId,
        listItems:
          sourceNote.listItems.length > 0
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
        labels:
          sourceNote.labels.length > 0
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
    if (
      existing.imageUrl &&
      process.env.BLOB_READ_WRITE_TOKEN &&
      existing.imageUrl.includes("public.blob.vercel-storage.com")
    ) {
      try {
        await del(existing.imageUrl);
      } catch (e) {
        console.error("Failed to delete old blob:", e);
      }
    }

    let imageUrl = "";
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn("BLOB_READ_WRITE_TOKEN is missing. Using fallback mockup image.");
      imageUrl =
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60";
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
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Failed to upload note image:", error);
    return { success: false, error: `Gagal mengupload gambar: ${msg}` };
  }
}

export async function deleteNoteImage(id: string) {
  try {
    const existing = await db.note.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Catatan tidak ditemukan" };

    if (
      existing.imageUrl &&
      process.env.BLOB_READ_WRITE_TOKEN &&
      existing.imageUrl.includes("public.blob.vercel-storage.com")
    ) {
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
  } catch (error) {
    console.error("Failed to delete note image:", error);
    return { success: false, error: "Gagal menghapus gambar" };
  }
}

// ── fetchLinkMetadata — dengan SSRF protection ────────────────────────────────

export async function fetchLinkMetadata(url: string) {
  try {
    const parsedUrl = new URL(url);

    // Blokir IP internal / private (SSRF protection)
    if (!isSsrfSafeUrl(parsedUrl)) {
      console.warn("[SSRF] Blocked request to private host:", parsedUrl.hostname);
      return null;
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;

    const html = await response.text();

    // Extract title (og:title or <title>)
    let title = "";
    const ogTitleMatch =
      html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    if (ogTitleMatch) {
      title = ogTitleMatch[1];
    } else {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) title = titleMatch[1];
    }

    // Extract description
    let description = "";
    const ogDescMatch =
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
    if (ogDescMatch) {
      description = ogDescMatch[1];
    } else {
      const descMatch =
        html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
      if (descMatch) description = descMatch[1];
    }

    // Extract image (og:image)
    let image = "";
    const ogImgMatch =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImgMatch) image = ogImgMatch[1];

    const unescape = (str: string) =>
      str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x2F;/g, "/");

    const cleanTitle = title ? unescape(title.trim()) : "";
    const cleanDescription = description ? unescape(description.trim()) : "";
    let cleanImage = image ? image.trim() : "";

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

// ── Folder Actions ─────────────────────────────────────────────────────────────

export async function getFolders() {
  try {
    const folders = await db.folder.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            notes: {
              where: { isTrashed: false, isArchived: false },
            },
          },
        },
      },
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
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
