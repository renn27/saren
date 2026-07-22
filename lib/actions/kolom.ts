"use server";

import { db } from "../db";
import { revalidatePath } from "next/cache";
import { TipeKolom } from "@prisma/client";
import { z } from "zod";

const kolomSchema = z.object({
  aplikasiId: z.string(),
  namaKolom: z.string().min(1, "Nama kolom wajib diisi."),
  tipeKolom: z.enum(["TEKS", "NOMOR", "NOMINAL", "CENTANG", "TANGGAL", "RUMUS"]),
  rumus: z.string().nullable().optional(),
  isTarget: z.boolean().optional(),
  nilaiTarget: z.string().nullable().optional(),
  isAccumulated: z.boolean().optional(),
});

export async function createKolom(
  garapanId: string | null,
  formData: {
    aplikasiId: string;
    namaKolom: string;
    tipeKolom: TipeKolom;
    rumus?: string | null;
    isTarget?: boolean;
    nilaiTarget?: string | null;
    isAccumulated?: boolean;
  }
) {
  const validation = kolomSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  const { aplikasiId, namaKolom, tipeKolom, rumus, isTarget, nilaiTarget, isAccumulated } = validation.data;

  try {
    const existing = await db.kolom.findFirst({
      where: {
        aplikasiId,
        namaKolom: {
          equals: namaKolom,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return { success: false, error: "Nama kolom sudah digunakan di aplikasi ini." };
    }

    const count = await db.kolom.count({
      where: { aplikasiId },
    });

    try {
      await db.kolom.create({
        data: {
          aplikasiId,
          namaKolom,
          tipeKolom: tipeKolom as any,
          rumus: tipeKolom === "RUMUS" ? rumus || null : null,
          urutan: count,
          isTarget: isTarget || false,
          nilaiTarget: nilaiTarget || null,
          isAccumulated: isAccumulated || false,
        },
      });
    } catch (createErr) {
      console.warn("db.kolom.create failed, executing raw SQL fallback:", createErr);
      const newId = `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await db.$executeRawUnsafe(
        `INSERT INTO "kolom" ("id", "aplikasiId", "namaKolom", "tipeKolom", "rumus", "urutan", "isTarget", "nilaiTarget", "isAccumulated", "createdAt")
         VALUES ($1, $2, $3, $4::"TipeKolom", $5, $6, $7, $8, $9, NOW())`,
        newId,
        aplikasiId,
        namaKolom,
        tipeKolom,
        tipeKolom === "RUMUS" ? rumus || null : null,
        count,
        isTarget || false,
        nilaiTarget || null,
        isAccumulated || false
      );
    }

    if (garapanId) {
      revalidatePath(`/garapan/${garapanId}/aplikasi/${aplikasiId}`);
    } else {
      revalidatePath(`/aplikasi/${aplikasiId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Error creating kolom:", error);
    return { success: false, error: error instanceof Error ? error.message : "Gagal menambahkan kolom." };
  }
}

export async function deleteKolom(id: string, garapanId: string | null, aplikasiId: string) {
  try {
    await db.kolom.delete({
      where: { id },
    });

    // Reorder remaining columns
    const columns = await db.kolom.findMany({
      where: { aplikasiId },
      orderBy: { urutan: "asc" },
    });

    for (let i = 0; i < columns.length; i++) {
      await db.kolom.update({
        where: { id: columns[i].id },
        data: { urutan: i },
      });
    }

    if (garapanId) {
      revalidatePath(`/garapan/${garapanId}/aplikasi/${aplikasiId}`);
    } else {
      revalidatePath(`/aplikasi/${aplikasiId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Error deleting kolom:", error);
    return { success: false, error: "Gagal menghapus kolom." };
  }
}

export async function updateKolom(
  id: string,
  garapanId: string | null,
  formData: {
    aplikasiId: string;
    namaKolom: string;
    tipeKolom: TipeKolom;
    rumus?: string | null;
    isTarget?: boolean;
    nilaiTarget?: string | null;
    isAccumulated?: boolean;
  }
) {
  const validation = kolomSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  const { aplikasiId, namaKolom, tipeKolom, rumus, isTarget, nilaiTarget, isAccumulated } = validation.data;

  try {
    const existing = await db.kolom.findFirst({
      where: {
        aplikasiId,
        namaKolom: {
          equals: namaKolom,
          mode: "insensitive",
        },
        id: {
          not: id,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Nama kolom sudah digunakan di aplikasi ini." };
    }

    try {
      await db.kolom.update({
        where: { id },
        data: {
          namaKolom,
          tipeKolom: tipeKolom as any,
          rumus: tipeKolom === "RUMUS" ? rumus || null : null,
          isTarget: isTarget || false,
          nilaiTarget: nilaiTarget || null,
          isAccumulated: isAccumulated || false,
        },
      });
    } catch (updateErr) {
      console.warn("db.kolom.update failed, executing raw SQL fallback:", updateErr);
      await db.$executeRawUnsafe(
        `UPDATE "kolom"
         SET "namaKolom" = $1, "tipeKolom" = $2::"TipeKolom", "rumus" = $3, "isTarget" = $4, "nilaiTarget" = $5, "isAccumulated" = $6
         WHERE "id" = $7`,
        namaKolom,
        tipeKolom,
        tipeKolom === "RUMUS" ? rumus || null : null,
        isTarget || false,
        nilaiTarget || null,
        isAccumulated || false,
        id
      );
    }

    if (garapanId) {
      revalidatePath(`/garapan/${garapanId}/aplikasi/${aplikasiId}`);
    } else {
      revalidatePath(`/aplikasi/${aplikasiId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Error updating kolom:", error);
    return { success: false, error: "Gagal memperbarui kolom." };
  }
}

export async function swapKolomUrutan(
  garapanId: string | null,
  aplikasiId: string,
  kolomId1: string,
  kolomId2: string
) {
  try {
    let col1 = await db.kolom.findUnique({ where: { id: kolomId1 } });
    let col2 = await db.kolom.findUnique({ where: { id: kolomId2 } });

    if (!col1 || !col2) {
      return { success: false, error: "Kolom tidak ditemukan." };
    }

    if (col1.urutan === col2.urutan) {
      // Re-index all columns for this application first
      const columns = await db.kolom.findMany({
        where: { aplikasiId },
        orderBy: [
          { urutan: "asc" },
          { createdAt: "asc" },
        ],
      });

      for (let i = 0; i < columns.length; i++) {
        await db.kolom.update({
          where: { id: columns[i].id },
          data: { urutan: i },
        });
      }

      // Re-fetch updated columns
      const u1 = await db.kolom.findUnique({ where: { id: kolomId1 } });
      const u2 = await db.kolom.findUnique({ where: { id: kolomId2 } });
      if (u1 && u2) {
        col1 = u1;
        col2 = u2;
      }
    }

    const temp = col1.urutan;
    await db.kolom.update({
      where: { id: kolomId1 },
      data: { urutan: col2.urutan },
    });
    await db.kolom.update({
      where: { id: kolomId2 },
      data: { urutan: temp },
    });

    if (garapanId) {
      revalidatePath(`/garapan/${garapanId}/aplikasi/${aplikasiId}`);
    } else {
      revalidatePath(`/aplikasi/${aplikasiId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Error swapping kolom:", error);
    return { success: false, error: "Gagal memindahkan kolom." };
  }
}

export async function clearKolomData(id: string, garapanId: string | null, aplikasiId: string) {
  try {
    const col = await db.kolom.findUnique({
      where: { id },
    });
    if (!col) {
      return { success: false, error: "Kolom tidak ditemukan." };
    }

    const akuns = await db.akun.findMany({
      where: { aplikasiId },
    });

    const isCentang = col.tipeKolom === "CENTANG";

    // Gunakan transaction untuk memastikan semua data di-update secara konsisten
    await db.$transaction(
      akuns.map((acc) => {
        const updatedCustomValues = { ...(acc.customValues as Record<string, any>) };
        if (isCentang) {
          updatedCustomValues[id] = false;
        } else {
          updatedCustomValues[id] = null;
        }

        return db.akun.update({
          where: { id: acc.id },
          data: {
            customValues: updatedCustomValues,
          },
        });
      })
    );

    if (garapanId) {
      revalidatePath(`/garapan/${garapanId}/aplikasi/${aplikasiId}`);
    } else {
      revalidatePath(`/aplikasi/${aplikasiId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Error clearing kolom data:", error);
    return { success: false, error: "Gagal mengosongkan data kolom." };
  }
}
