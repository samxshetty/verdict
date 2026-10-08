import { supabase } from "./supabase";

export async function uploadPaymentScreenshot(
  file: File
) {
  const filename =
    Date.now() + "-" + file.name;

  const { data, error } =
    await supabase.storage
      .from("payment-screenshots")
      .upload(filename, file);

  if (error) throw error;

  return data.path;
}