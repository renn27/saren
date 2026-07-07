"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createNomor(data: { provider: string; nomorKartu: string; masaAktif: Date | string; pulsa?: number }) {
  try {
    const nomor = await db.nomor.create({
      data: {
        provider: data.provider,
        nomorKartu: data.nomorKartu,
        masaAktif: new Date(data.masaAktif),
        pulsa: data.pulsa ?? 0,
      },
    });
    revalidatePath("/nomor");
    return { success: true, data: nomor };
  } catch (error: any) {
    console.error("Failed to create nomor:", error);
    return { success: false, error: `Gagal menyimpan nomor: ${error?.message || error}` };
  }
}

export async function updateNomor(id: string, data: { provider: string; nomorKartu: string; masaAktif: Date | string; pulsa?: number }) {
  try {
    const nomor = await db.nomor.update({
      where: { id },
      data: {
        provider: data.provider,
        nomorKartu: data.nomorKartu,
        masaAktif: new Date(data.masaAktif),
        pulsa: data.pulsa !== undefined ? data.pulsa : undefined,
      },
    });
    revalidatePath("/nomor");
    return { success: true, data: nomor };
  } catch (error: any) {
    console.error("Failed to update nomor:", error);
    return { success: false, error: `Gagal memperbarui nomor: ${error?.message || error}` };
  }
}

export async function deleteNomor(id: string) {
  try {
    await db.nomor.delete({
      where: { id },
    });
    revalidatePath("/nomor");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete nomor:", error);
    return { success: false, error: "Gagal menghapus nomor" };
  }
}
