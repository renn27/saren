// Tipe-tipe yang dipakai bersama oleh NoteClient dan NoteCard

export type NoteListItem = {
  id: string;
  noteId: string;
  text: string;
  isCompleted: boolean;
  urutan: number;
};

export type Label = {
  id: string;
  name: string;
};

export type Note = {
  id: string;
  title: string | null;
  content: string | null;
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  color: string;
  isList: boolean;
  isTable: boolean;
  imageUrl: string | null;
  folderId: string | null;
  folder?: { id: string; name: string } | null;
  listItems: NoteListItem[];
  labels: Label[];
  reminderAt: Date | string | null;
  reminderMinutesBefore: number;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type FolderItem = {
  id: string;
  name: string;
  _count?: { notes: number };
};
