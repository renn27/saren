"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginUser(prevState: any, formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const rememberMe = formData.get("rememberMe") === "true" || formData.get("rememberMe") === "on";

  if (username !== "rendi" || password !== "rendi270803") {
    return { success: false, error: "Username atau password salah!" };
  }

  const cookieStore = await cookies();

  // Konfigurasi cookie
  const cookieOptions: any = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };

  // Jika ingat saya diaktifkan, atur kedaluwarsa 10 tahun (limit maksimal yang disarankan)
  if (rememberMe) {
    cookieOptions.maxAge = 60 * 60 * 24 * 365 * 10; // 10 tahun
  }

  cookieStore.set("saren_session", "rendi_logged_in_270803", cookieOptions);

  return { success: true };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("saren_session");
  redirect("/login");
}
