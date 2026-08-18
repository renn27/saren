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
      select: {
        id: true,
        namaAplikasi: true,
        logoUrl: true,
        deskripsi: true,
        kategori: true,
        kolom: {
          select: {
            id: true,
            tipeKolom: true,
            isTarget: true,
            nilaiTarget: true,
            rumus: true,
          },
        },
        akun: {
          select: {
            customValues: true,
          },
        },
      },
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
      select: {
        id: true,
        namaAplikasi: true,
        logoUrl: true,
        deskripsi: true,
        kategori: true,
        _count: {
          select: { akun: true },
        },
        kolom: {
          select: {
            id: true,
            tipeKolom: true,
            isTarget: true,
            nilaiTarget: true,
            rumus: true,
          },
        },
        akun: {
          select: {
            id: true,
            nama: true,
            device: true,
            nomorHp: true,
            urutan: true,
            customValues: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    console.error("Failed to fetch standalone aplikasi list via Prisma ORM, using raw query fallback:", error);
    try {
      const rows = await db.$queryRaw<any[]>`
        SELECT * FROM "aplikasi" WHERE "garapanId" IS NULL ORDER BY "createdAt" ASC
      `;
      return rows.map((app) => ({
        ...app,
        _count: { akun: 0 },
        kolom: [],
        akun: [],
      }));
    } catch (rawError) {
      console.error("Failed raw query fallback for standalone aplikasi list:", rawError);
      return [];
    }
  }
}

export async function importAplikasiToGarapan(standaloneAplikasiId: string, garapanId: string) {
  try {
    const standaloneApp = await db.aplikasi.findUnique({
      where: { id: standaloneAplikasiId },
      include: {
        akun: {
          orderBy: { urutan: "asc" },
        },
      },
    });

    if (!standaloneApp) {
      return { success: false, error: "Aplikasi standalone tidak ditemukan." };
    }

    const newApp = await db.$transaction(async (tx) => {
      const createdApp = await tx.aplikasi.create({
        data: {
          garapanId,
          namaAplikasi: standaloneApp.namaAplikasi,
          logoUrl: standaloneApp.logoUrl,
          deskripsi: standaloneApp.deskripsi,
          kategori: standaloneApp.kategori,
        },
      });

      if (standaloneApp.akun.length > 0) {
        await tx.akun.createMany({
          data: standaloneApp.akun.map((acc, index) => ({
            aplikasiId: createdApp.id,
            nama: acc.nama,
            device: acc.device,
            nomorHp: acc.nomorHp,
            urutan: acc.urutan ?? index,
            customValues: {},
          })),
        });
      }

      return createdApp;
    });

    revalidatePath(`/garapan/${garapanId}`);
    return { success: true, aplikasi: newApp };
  } catch (error) {
    console.error("Failed to import aplikasi to garapan:", error);
    return { success: false, error: "Gagal mengimpor aplikasi ke garapan." };
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
    console.error("Failed to fetch aplikasi via Prisma ORM, attempting raw query fallback:", error);
    try {
      const aplikasiRows = await db.$queryRaw<any[]>`
        SELECT * FROM "aplikasi" WHERE "id" = ${id} LIMIT 1
      `;
      if (!aplikasiRows || aplikasiRows.length === 0) return null;
      const app = aplikasiRows[0];

      const kolomRows = await db.$queryRaw<any[]>`
        SELECT * FROM "kolom" WHERE "aplikasiId" = ${id} ORDER BY "urutan" ASC
      `;

      const akunRows = await db.$queryRaw<any[]>`
        SELECT * FROM "akun" WHERE "aplikasiId" = ${id} ORDER BY "urutan" ASC
      `;

      return {
        ...app,
        kolom: kolomRows || [],
        akun: akunRows || [],
      };
    } catch (rawError) {
      console.error("Failed to fetch aplikasi via raw fallback:", rawError);
      return null;
    }
  }
}

export async function createAplikasi(garapanId: string | null, formData: FormData) {
  const namaAplikasi = formData.get("namaAplikasi") as string;
  const file = formData.get("logo") as File | null;
  const deskripsi = formData.get("deskripsi") as string | null;
  const kategori = formData.get("kategori") as string | null;

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
        console.warn("BLOB_READ_WRITE_TOKEN is missing. Logo upload skipped.");
        logoUrl = null;
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
    const newApp = await db.aplikasi.create({
      data: {
        garapanId,
        namaAplikasi,
        logoUrl,
        deskripsi: deskripsi?.trim() || null,
        kategori: kategori?.trim() || null,
      },
    });

    if (garapanId) {
      revalidatePath(`/garapan/${garapanId}`);
    } else {
      revalidatePath("/aplikasi");
    }
    return { success: true, data: newApp };
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
  const kategori = formData.get("kategori") as string | null;

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
          console.warn("BLOB_READ_WRITE_TOKEN is missing. Logo upload skipped.");
          logoUrl = null;
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

    const updatedApp = await db.aplikasi.update({
      where: { id },
      data: {
        namaAplikasi,
        logoUrl,
        deskripsi: deskripsi?.trim() || null,
        kategori: kategori?.trim() || null,
      },
    });

    if (garapanId) {
      revalidatePath(`/garapan/${garapanId}`);
      revalidatePath(`/garapan/${garapanId}/aplikasi/${id}`);
    } else {
      revalidatePath("/aplikasi");
      revalidatePath(`/aplikasi/${id}`);
    }
    return { success: true, data: updatedApp };
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
