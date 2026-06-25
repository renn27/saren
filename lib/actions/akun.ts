"use server";

import { db } from "../db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const akunSchema = z.object({
  aplikasiId: z.string(),
  nama: z.string().min(1, "Nama wajib diisi."),
  device: z.string().nullable().optional(),
  nomorHp: z.string().nullable().optional(),
});

export async function createAkun(
  garapanId: string,
  data: {
    aplikasiId: string;
    nama: string;
    device?: string | null;
    nomorHp?: string | null;
    customValues: Record<string, any>;
  }
) {
  const validation = akunSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  const { aplikasiId, nama, device, nomorHp } = validation.data;
  const trimmedNama = nama.trim();

  try {
    const existingAkun = await db.akun.findFirst({
      where: {
        aplikasiId,
        nama: {
          equals: trimmedNama,
          mode: "insensitive",
        },
      },
    });

    if (existingAkun) {
      return { success: false, error: "Nama akun ini sudah terdaftar di aplikasi ini." };
    }

    const columns = await db.kolom.findMany({
      where: { aplikasiId },
    });

    const validatedCustomValues: Record<string, any> = {};

    for (const col of columns) {
      const val = data.customValues[col.id];

      if (col.tipeKolom === "NOMOR" || col.tipeKolom === "NOMINAL") {
        if (val !== undefined && val !== null && val !== "") {
          const num = Number(val);
          if (isNaN(num)) {
            return { success: false, error: `Nilai kolom '${col.namaKolom}' harus berupa angka.` };
          }
          validatedCustomValues[col.id] = num;
        } else {
          validatedCustomValues[col.id] = null;
        }
      } else if (col.tipeKolom === "CENTANG") {
        validatedCustomValues[col.id] = Boolean(val);
      } else {
        validatedCustomValues[col.id] = val !== undefined && val !== null ? String(val) : null;
      }
    }

    const count = await db.akun.count({
      where: { aplikasiId },
    });

    await db.akun.create({
      data: {
        aplikasiId,
        nama: trimmedNama,
        device: device || null,
        nomorHp: nomorHp || null,
        customValues: validatedCustomValues,
        urutan: count,
      },
    });

    revalidatePath(`/garapan/${garapanId}/aplikasi/${aplikasiId}`);
    return { success: true };
  } catch (error) {
    console.error("Error creating akun:", error);
    return { success: false, error: "Gagal menambahkan akun." };
  }
}

export async function updateAkun(
  id: string,
  garapanId: string,
  data: {
    aplikasiId: string;
    nama: string;
    device?: string | null;
    nomorHp?: string | null;
    customValues: Record<string, any>;
  }
) {
  const validation = akunSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  const { aplikasiId, nama, device, nomorHp } = validation.data;
  const trimmedNama = nama.trim();

  try {
    const existingAkun = await db.akun.findFirst({
      where: {
        aplikasiId,
        nama: {
          equals: trimmedNama,
          mode: "insensitive",
        },
        id: {
          not: id,
        },
      },
    });

    if (existingAkun) {
      return { success: false, error: "Nama akun ini sudah terdaftar di aplikasi ini." };
    }

    const columns = await db.kolom.findMany({
      where: { aplikasiId },
    });

    const validatedCustomValues: Record<string, any> = {};

    for (const col of columns) {
      const val = data.customValues[col.id];

      if (col.tipeKolom === "NOMOR" || col.tipeKolom === "NOMINAL") {
        if (val !== undefined && val !== null && val !== "") {
          const num = Number(val);
          if (isNaN(num)) {
            return { success: false, error: `Nilai kolom '${col.namaKolom}' harus berupa angka.` };
          }
          validatedCustomValues[col.id] = num;
        } else {
          validatedCustomValues[col.id] = null;
        }
      } else if (col.tipeKolom === "CENTANG") {
        validatedCustomValues[col.id] = Boolean(val);
      } else {
        validatedCustomValues[col.id] = val !== undefined && val !== null ? String(val) : null;
      }
    }

    await db.akun.update({
      where: { id },
      data: {
        nama: trimmedNama,
        device: device || null,
        nomorHp: nomorHp || null,
        customValues: validatedCustomValues,
      },
    });

    revalidatePath(`/garapan/${garapanId}/aplikasi/${aplikasiId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating akun:", error);
    return { success: false, error: "Gagal memperbarui akun." };
  }
}

export async function deleteAkun(id: string, garapanId: string, aplikasiId: string) {
  try {
    await db.akun.delete({
      where: { id },
    });

    // Reorder remaining accounts
    const accounts = await db.akun.findMany({
      where: { aplikasiId },
      orderBy: { urutan: "asc" },
    });

    for (let i = 0; i < accounts.length; i++) {
      await db.akun.update({
        where: { id: accounts[i].id },
        data: { urutan: i },
      });
    }

    revalidatePath(`/garapan/${garapanId}/aplikasi/${aplikasiId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting akun:", error);
    return { success: false, error: "Gagal menghapus akun." };
  }
}

export async function swapAkunUrutan(
  garapanId: string,
  aplikasiId: string,
  akunId1: string,
  akunId2: string
) {
  try {
    let akun1 = await db.akun.findUnique({ where: { id: akunId1 } });
    let akun2 = await db.akun.findUnique({ where: { id: akunId2 } });

    if (!akun1 || !akun2) {
      return { success: false, error: "Akun tidak ditemukan." };
    }

    if (akun1.urutan === akun2.urutan) {
      // Re-index all accounts for this application first
      const accounts = await db.akun.findMany({
        where: { aplikasiId },
        orderBy: [
          { urutan: "asc" },
          { createdAt: "asc" },
        ],
      });

      for (let i = 0; i < accounts.length; i++) {
        await db.akun.update({
          where: { id: accounts[i].id },
          data: { urutan: i },
        });
      }

      // Re-fetch updated accounts
      const u1 = await db.akun.findUnique({ where: { id: akunId1 } });
      const u2 = await db.akun.findUnique({ where: { id: akunId2 } });
      if (u1 && u2) {
        akun1 = u1;
        akun2 = u2;
      }
    }

    const temp = akun1.urutan;
    await db.akun.update({
      where: { id: akunId1 },
      data: { urutan: akun2.urutan },
    });
    await db.akun.update({
      where: { id: akunId2 },
      data: { urutan: temp },
    });

    revalidatePath(`/garapan/${garapanId}/aplikasi/${aplikasiId}`);
    return { success: true };
  } catch (error) {
    console.error("Error swapping akun:", error);
    return { success: false, error: "Gagal memindahkan akun." };
  }
}

export async function getAllAccountsForAutofill() {
  try {
    const data = await db.akun.findMany({
      include: {
        aplikasi: {
          select: {
            namaAplikasi: true,
          },
        },
      },
      orderBy: {
        nama: "asc",
      },
    });
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching accounts for autofill:", error);
    return { success: false, error: "Gagal mengambil data akun." };
  }
}
