import { supabase } from "./client";

export async function getEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at");

  if (error) throw error;

  return data;
}