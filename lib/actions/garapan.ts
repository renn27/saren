"use server";

import { db } from "../db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const garapanSchema = z.object({
  bulan: z.coerce.number().min(1).max(12),
  tahun: z.coerce.number().min(2000).max(2100),
});

export async function getGarapanList() {
  try {
    return await db.garapan.findMany({
      select: {
        id: true,
        bulan: true,
        tahun: true,
        aplikasi: {
          select: {
            id: true,
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
        },
      },
      orderBy: [
        { tahun: "desc" },
        { bulan: "desc" },
      ],
    });
  } catch (error) {
    console.error("Failed to fetch garapan list:", error);
    return [];
  }
}

export async function getGarapan(id: string) {
  try {
    // 1. Coba cari berdasarkan ID (CUID)
    let garapan = await db.garapan.findUnique({
      where: { id },
    });

    if (garapan) return garapan;

    // 2. Fallback: Parsing nama bulan / angka bulan / format bulan-tahun (misal: "agustus", "8", "8-2026", "2026-8")
    const cleanId = id.trim().toLowerCase();
    const MONTH_MAP: Record<string, number> = {
      januari: 1, jan: 1, january: 1,
      februari: 2, feb: 2, february: 2,
      maret: 3, mar: 3, march: 3,
      april: 4, apr: 4,
      mei: 5, may: 5,
      juni: 6, jun: 6, june: 6,
      juli: 7, jul: 7, july: 7,
      agustus: 8, agu: 8, ags: 8, august: 8,
      september: 9, sep: 9, sept: 9,
      oktober: 10, okt: 10, oct: 10, october: 10,
      november: 11, nov: 11,
      desember: 12, des: 12, dec: 12, december: 12,
    };

    let targetBulan: number | null = null;
    let targetTahun: number = new Date().getFullYear();

    if (cleanId.includes("-")) {
      const parts = cleanId.split("-");
      if (parts.length === 2) {
        const p1 = parseInt(parts[0], 10);
        const p2 = parseInt(parts[1], 10);
        if (!isNaN(p1) && !isNaN(p2)) {
          if (p1 > 1000) {
            targetTahun = p1;
            targetBulan = p2;
          } else {
            targetBulan = p1;
            targetTahun = p2;
          }
        }
      }
    } else if (MONTH_MAP[cleanId]) {
      targetBulan = MONTH_MAP[cleanId];
    } else {
      const parsedNum = parseInt(cleanId, 10);
      if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 12) {
        targetBulan = parsedNum;
      }
    }

    if (targetBulan !== null) {
      garapan = await db.garapan.findFirst({
        where: {
          bulan: targetBulan,
          tahun: targetTahun,
        },
      });
    }

    return garapan;
  } catch (error) {
    console.error("Failed to fetch garapan:", error);
    return null;
  }
}

export async function createGarapan(formData: { bulan: number; tahun: number }) {
  const validation = garapanSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: "Data bulan atau tahun tidak valid." };
  }

  const { bulan, tahun } = validation.data;

  try {
    const existing = await db.garapan.findUnique({
      where: {
        bulan_tahun: {
          bulan,
          tahun,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Garapan untuk bulan ini sudah ada." };
    }

    const newGarapan = await db.garapan.create({
      data: {
        bulan,
        tahun,
      },
    });

    revalidatePath("/");
    return { success: true, data: newGarapan };
  } catch (error: any) {
    console.error("Error creating garapan:", error);
    return { success: false, error: "Gagal menambahkan garapan." };
  }
}

export async function updateGarapan(id: string, formData: { bulan: number; tahun: number }) {
  const validation = garapanSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: "Data bulan atau tahun tidak valid." };
  }

  const { bulan, tahun } = validation.data;

  try {
    const existing = await db.garapan.findFirst({
      where: {
        bulan,
        tahun,
        id: { not: id },
      },
    });

    if (existing) {
      return { success: false, error: "Garapan untuk bulan ini sudah ada." };
    }

    const updatedGarapan = await db.garapan.update({
      where: { id },
      data: {
        bulan,
        tahun,
      },
    });

    revalidatePath("/");
    return { success: true, data: updatedGarapan };
  } catch (error) {
    console.error("Error updating garapan:", error);
    return { success: false, error: "Gagal memperbarui garapan." };
  }
}

export async function deleteGarapan(id: string) {
  try {
    await db.garapan.delete({
      where: { id },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting garapan:", error);
    return { success: false, error: "Gagal menghapus garapan." };
  }
}

export async function duplicateGarapan(sourceId: string, targetData: { bulan: number; tahun: number }) {
  const validation = garapanSchema.safeParse(targetData);
  if (!validation.success) {
    return { success: false, error: "Data bulan atau tahun tidak valid." };
  }

  const { bulan: targetBulan, tahun: targetTahun } = validation.data;

  try {
    // 1. Check if source Garapan exists with all nested relations
    const sourceGarapan = await db.garapan.findUnique({
      where: { id: sourceId },
      include: {
        aplikasi: {
          include: {
            kolom: true,
            akun: true,
          },
        },
      },
    });

    if (!sourceGarapan) {
      return { success: false, error: "Data asal (source) tidak ditemukan." };
    }

    // 2. Check if target Garapan already exists
    const existing = await db.garapan.findUnique({
      where: {
        bulan_tahun: {
          bulan: targetBulan,
          tahun: targetTahun,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Garapan untuk bulan ini sudah ada." };
    }

    // 3. Duplicate inside a transaction
    await db.$transaction(async (tx) => {
      // Create new Garapan
      const newGarapan = await tx.garapan.create({
        data: {
          bulan: targetBulan,
          tahun: targetTahun,
        },
      });

      // Loop over aplikasi
      for (const app of sourceGarapan.aplikasi) {
        // Create new Aplikasi
        const newApp = await tx.aplikasi.create({
          data: {
            garapanId: newGarapan.id,
            namaAplikasi: app.namaAplikasi,
            logoUrl: app.logoUrl,
            deskripsi: app.deskripsi,
            kategori: app.kategori,
          },
        });

        // Copy columns
        const kolomIdMap = new Map<string, string>();
        for (const col of app.kolom) {
          const newCol = await tx.kolom.create({
            data: {
              aplikasiId: newApp.id,
              namaKolom: col.namaKolom,
              tipeKolom: col.tipeKolom,
              rumus: col.rumus,
              urutan: col.urutan,
              isTarget: col.isTarget,
              nilaiTarget: col.nilaiTarget,
              isAccumulated: col.isAccumulated,
            },
          });
          kolomIdMap.set(col.id, newCol.id);
        }

        // Copy accounts in a single batch
        if (app.akun.length > 0) {
          const accountsData = app.akun.map((acc) => {
            const oldCustomValues = (acc.customValues || {}) as Record<string, any>;
            const newCustomValues: Record<string, any> = {};
            for (const [oldColId, value] of Object.entries(oldCustomValues)) {
              const newColId = kolomIdMap.get(oldColId);
              if (newColId) {
                newCustomValues[newColId] = value;
              }
            }

            return {
              aplikasiId: newApp.id,
              nama: acc.nama,
              device: acc.device,
              nomorHp: acc.nomorHp,
              customValues: newCustomValues,
              urutan: acc.urutan,
            };
          });

          await tx.akun.createMany({ data: accountsData });
        }
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error duplicating garapan:", error);
    return { success: false, error: "Gagal menduplikat garapan." };
  }
}
