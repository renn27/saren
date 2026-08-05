"use server";

import { db } from "../db";
import { revalidatePath } from "next/cache";

export async function exportFullBackup() {
  try {
    const [garapan, aplikasi, kolom, akun, nomor, note, label, folder] = await Promise.all([
      db.garapan.findMany({ orderBy: { createdAt: "asc" } }),
      db.aplikasi.findMany({ orderBy: { createdAt: "asc" } }),
      db.kolom.findMany({ orderBy: { urutan: "asc" } }),
      db.akun.findMany({ orderBy: { urutan: "asc" } }),
      db.nomor.findMany({ orderBy: { createdAt: "asc" } }),
      db.note.findMany({
        include: {
          listItems: { orderBy: { urutan: "asc" } },
          labels: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      db.label.findMany({ orderBy: { name: "asc" } }),
      db.folder.findMany({ orderBy: { name: "asc" } }),
    ]);

    const backupPayload = {
      version: "1.0",
      app: "SAREN",
      exportedAt: new Date().toISOString(),
      data: {
        garapan,
        aplikasi,
        kolom,
        akun,
        nomor,
        note,
        label,
        folder,
      },
    };

    return { success: true, backupPayload };
  } catch (error: any) {
    console.error("Failed to export full backup:", error);
    return { success: false, error: `Gagal mengekspor data cadangan: ${error?.message || error}` };
  }
}

export async function restoreFullBackup(
  payload: any,
  mode: "merge" | "overwrite" = "merge"
) {
  try {
    if (!payload || !payload.data || typeof payload.data !== "object") {
      return { success: false, error: "Format file cadangan tidak valid." };
    }

    const { garapan = [], aplikasi = [], kolom = [], akun = [], nomor = [], note = [], label = [], folder = [] } = payload.data;

    await db.$transaction(async (tx) => {
      if (mode === "overwrite") {
        // Hapus data secara hierarkis
        await tx.akun.deleteMany();
        await tx.kolom.deleteMany();
        await tx.aplikasi.deleteMany();
        await tx.garapan.deleteMany();
        await tx.nomor.deleteMany();
        await tx.noteListItem.deleteMany();
        await tx.note.deleteMany();
        await tx.label.deleteMany();
        await tx.folder.deleteMany();
      }

      // 1. Restore Folders
      for (const f of folder) {
        await tx.folder.upsert({
          where: { id: f.id },
          create: {
            id: f.id,
            name: f.name,
            createdAt: new Date(f.createdAt || Date.now()),
            updatedAt: new Date(f.updatedAt || Date.now()),
          },
          update: { name: f.name },
        });
      }

      // 2. Restore Labels
      for (const l of label) {
        await tx.label.upsert({
          where: { id: l.id },
          create: { id: l.id, name: l.name },
          update: { name: l.name },
        });
      }

      // 3. Restore Garapan
      for (const g of garapan) {
        await tx.garapan.upsert({
          where: { id: g.id },
          create: {
            id: g.id,
            bulan: g.bulan,
            tahun: g.tahun,
            createdAt: new Date(g.createdAt || Date.now()),
            updatedAt: new Date(g.updatedAt || Date.now()),
          },
          update: { bulan: g.bulan, tahun: g.tahun },
        });
      }

      // 4. Restore Aplikasi
      for (const app of aplikasi) {
        await tx.aplikasi.upsert({
          where: { id: app.id },
          create: {
            id: app.id,
            garapanId: app.garapanId || null,
            namaAplikasi: app.namaAplikasi,
            logoUrl: app.logoUrl || null,
            deskripsi: app.deskripsi || null,
            kategori: app.kategori || null,
            createdAt: new Date(app.createdAt || Date.now()),
            updatedAt: new Date(app.updatedAt || Date.now()),
          },
          update: {
            garapanId: app.garapanId || null,
            namaAplikasi: app.namaAplikasi,
            logoUrl: app.logoUrl || null,
            deskripsi: app.deskripsi || null,
            kategori: app.kategori || null,
          },
        });
      }

      // 5. Restore Kolom
      for (const col of kolom) {
        await tx.kolom.upsert({
          where: { id: col.id },
          create: {
            id: col.id,
            aplikasiId: col.aplikasiId,
            namaKolom: col.namaKolom,
            tipeKolom: col.tipeKolom,
            rumus: col.rumus || null,
            urutan: col.urutan ?? 0,
            isTarget: col.isTarget ?? false,
            nilaiTarget: col.nilaiTarget || null,
            isAccumulated: col.isAccumulated ?? false,
            createdAt: new Date(col.createdAt || Date.now()),
          },
          update: {
            namaKolom: col.namaKolom,
            tipeKolom: col.tipeKolom,
            rumus: col.rumus || null,
            urutan: col.urutan ?? 0,
            isTarget: col.isTarget ?? false,
            nilaiTarget: col.nilaiTarget || null,
            isAccumulated: col.isAccumulated ?? false,
          },
        });
      }

      // 6. Restore Akun
      for (const acc of akun) {
        await tx.akun.upsert({
          where: { id: acc.id },
          create: {
            id: acc.id,
            aplikasiId: acc.aplikasiId,
            nama: acc.nama,
            device: acc.device || null,
            nomorHp: acc.nomorHp || null,
            customValues: acc.customValues || {},
            urutan: acc.urutan ?? 0,
            createdAt: new Date(acc.createdAt || Date.now()),
            updatedAt: new Date(acc.updatedAt || Date.now()),
          },
          update: {
            nama: acc.nama,
            device: acc.device || null,
            nomorHp: acc.nomorHp || null,
            customValues: acc.customValues || {},
            urutan: acc.urutan ?? 0,
          },
        });
      }

      // 7. Restore Nomor
      for (const n of nomor) {
        await tx.nomor.upsert({
          where: { id: n.id },
          create: {
            id: n.id,
            provider: n.provider,
            nomorKartu: n.nomorKartu,
            pulsa: n.pulsa ?? 0,
            masaAktif: new Date(n.masaAktif),
            createdAt: new Date(n.createdAt || Date.now()),
            updatedAt: new Date(n.updatedAt || Date.now()),
          },
          update: {
            provider: n.provider,
            nomorKartu: n.nomorKartu,
            pulsa: n.pulsa ?? 0,
            masaAktif: new Date(n.masaAktif),
          },
        });
      }

      // 8. Restore Note & NoteListItem
      for (const nt of note) {
        const createdNote = await tx.note.upsert({
          where: { id: nt.id },
          create: {
            id: nt.id,
            title: nt.title || null,
            content: nt.content || null,
            isPinned: nt.isPinned ?? false,
            isArchived: nt.isArchived ?? false,
            isTrashed: nt.isTrashed ?? false,
            color: nt.color || "default",
            isList: nt.isList ?? false,
            isTable: nt.isTable ?? false,
            imageUrl: nt.imageUrl || null,
            folderId: nt.folderId || null,
            reminderAt: nt.reminderAt ? new Date(nt.reminderAt) : null,
            reminderMinutesBefore: nt.reminderMinutesBefore ?? 0,
            reminderSent: nt.reminderSent ?? false,
            createdAt: new Date(nt.createdAt || Date.now()),
            updatedAt: new Date(nt.updatedAt || Date.now()),
          },
          update: {
            title: nt.title || null,
            content: nt.content || null,
            isPinned: nt.isPinned ?? false,
            isArchived: nt.isArchived ?? false,
            isTrashed: nt.isTrashed ?? false,
            color: nt.color || "default",
            isList: nt.isList ?? false,
            isTable: nt.isTable ?? false,
            imageUrl: nt.imageUrl || null,
            folderId: nt.folderId || null,
          },
        });

        // Restore list items
        if (nt.listItems && Array.isArray(nt.listItems)) {
          for (const item of nt.listItems) {
            await tx.noteListItem.upsert({
              where: { id: item.id },
              create: {
                id: item.id,
                noteId: createdNote.id,
                text: item.text,
                isCompleted: item.isCompleted ?? false,
                urutan: item.urutan ?? 0,
              },
              update: {
                text: item.text,
                isCompleted: item.isCompleted ?? false,
                urutan: item.urutan ?? 0,
              },
            });
          }
        }
      }
    });

    revalidatePath("/");
    revalidatePath("/aplikasi");
    revalidatePath("/nomor");
    revalidatePath("/note");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to restore backup:", error);
    return { success: false, error: `Gagal memulihkan data: ${error?.message || error}` };
  }
}
