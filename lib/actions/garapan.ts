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
    return await db.garapan.findUnique({
      where: { id },
    });
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

    await db.garapan.create({
      data: {
        bulan,
        tahun,
      },
    });

    revalidatePath("/");
    return { success: true };
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

    await db.garapan.update({
      where: { id },
      data: {
        bulan,
        tahun,
      },
    });

    revalidatePath("/");
    return { success: true };
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
