import { supabase } from "./supabase";

export async function getEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("name");

  if (error) throw error;

  return data;
}