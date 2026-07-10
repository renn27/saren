"use server";

import { db } from "../db";
import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { z } from "zod";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function getAplikasiList(garapanId: string) {
  try {
    return await db.aplikasi.findMany({
      where: { garapanId },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    console.error("Failed to fetch aplikasi list:", error);
    return [];
  }
}

export async function getStandaloneAplikasiList() {
  try {
    return await db.aplikasi.findMany({
      where: { garapanId: null },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    console.error("Failed to fetch standalone aplikasi list:", error);
    return [];
  }
}

export async function getAplikasi(id: string) {
  try {
    return await db.aplikasi.findUnique({
      where: { id },
      include: {
        kolom: {
          orderBy: { urutan: "asc" },
        },
        akun: {
          orderBy: { urutan: "asc" },
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch aplikasi:", error);
    return null;
  }
}

export async function createAplikasi(garapanId: string | null, formData: FormData) {
  const namaAplikasi = formData.get("namaAplikasi") as string;
  const file = formData.get("logo") as File | null;
  const deskripsi = formData.get("deskripsi") as string | null;

  if (!namaAplikasi || namaAplikasi.trim().length === 0) {
    return { success: false, error: "Nama aplikasi wajib diisi." };
  }

  let logoUrl = null;

  if (file && file.size > 0) {
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "Ukuran logo maksimal 2MB." };
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return { success: false, error: "Format logo harus JPG, PNG, atau WEBP." };
    }

    try {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.warn("BLOB_READ_WRITE_TOKEN is missing. Using fallback mock logo URL.");
        // Fallback mockup
        logoUrl = "";
      } else {
        const blob = await put(`logos/${Date.now()}-${file.name}`, file, {
          access: "public",
        });
        logoUrl = blob.url;
      }
    } catch (error) {
      console.error("Vercel Blob upload failed:", error);
      return { success: false, error: "Gagal mengupload logo." };
    }
  }

  try {
    await db.aplikasi.create({
      data: {
        garapanId,
        namaAplikasi,
        logoUrl,
        deskripsi: deskripsi?.trim() || null,
      },
    });

    if (garapanId) {
      revalidatePath(`/garapan/${garapanId}`);
    } else {
      revalidatePath("/aplikasi");
    }
    return { success: true };
  } catch (error) {
    console.error("Error creating aplikasi:", error);
    return { success: false, error: "Gagal menambahkan aplikasi." };
  }
}

export async function updateAplikasi(id: string, garapanId: string | null, formData: FormData) {
  const namaAplikasi = formData.get("namaAplikasi") as string;
  const file = formData.get("logo") as File | null;
  const clearLogo = formData.get("clearLogo") === "true";
  const deskripsi = formData.get("deskripsi") as string | null;

  if (!namaAplikasi || namaAplikasi.trim().length === 0) {
    return { success: false, error: "Nama aplikasi wajib diisi." };
  }

  try {
    const existing = await db.aplikasi.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Aplikasi tidak ditemukan." };
    }

    let logoUrl = existing.logoUrl;

    if (clearLogo && existing.logoUrl) {
      if (process.env.BLOB_READ_WRITE_TOKEN && existing.logoUrl.includes("public.blob.vercel-storage.com")) {
        try {
          await del(existing.logoUrl);
        } catch (e) {
          console.error("Failed to delete old blob:", e);
        }
      }
      logoUrl = null;
    }

    if (file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: "Ukuran logo maksimal 2MB." };
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        return { success: false, error: "Format logo harus JPG, PNG, atau WEBP." };
      }

      // Delete old logo
      if (existing.logoUrl && process.env.BLOB_READ_WRITE_TOKEN && existing.logoUrl.includes("public.blob.vercel-storage.com")) {
        try {
          await del(existing.logoUrl);
        } catch (e) {
          console.error("Failed to delete old blob:", e);
        }
      }

      // Upload new logo
      try {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          console.warn("BLOB_READ_WRITE_TOKEN is missing. Using fallback mock logo URL.");
          logoUrl = "";
        } else {
          const blob = await put(`logos/${Date.now()}-${file.name}`, file, {
            access: "public",
          });
          logoUrl = blob.url;
        }
      } catch (error) {
        console.error("Vercel Blob upload failed:", error);
        return { success: false, error: "Gagal mengupload logo baru." };
      }
    }

    await db.aplikasi.update({
      where: { id },
      data: {
        namaAplikasi,
        logoUrl,
        deskripsi: deskripsi?.trim() || null,
      },
    });

    if (garapanId) {
      revalidatePath(`/garapan/${garapanId}`);
    } else {
      revalidatePath("/aplikasi");
      revalidatePath(`/aplikasi/${id}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Error updating aplikasi:", error);
    return { success: false, error: "Gagal memperbarui aplikasi." };
  }
}

export async function deleteAplikasi(id: string, garapanId: string | null) {
  try {
    const existing = await db.aplikasi.findUnique({ where: { id } });
    if (existing && existing.logoUrl && process.env.BLOB_READ_WRITE_TOKEN && existing.logoUrl.includes("public.blob.vercel-storage.com")) {
      try {
        await del(existing.logoUrl);
      } catch (e) {
        console.error("Failed to delete blob during application delete:", e);
      }
    }

    await db.aplikasi.delete({
      where: { id },
    });

    if (garapanId) {
      revalidatePath(`/garapan/${garapanId}`);
    } else {
      revalidatePath("/aplikasi");
    }
    return { success: true };
  } catch (error) {
    console.error("Error deleting aplikasi:", error);
    return { success: false, error: "Gagal menghapus aplikasi." };
  }
}
