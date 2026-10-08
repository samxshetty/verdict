import { supabase } from "./client";

export async function createRegistration(
  registration: any,
  members: any[]
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Login required");

  const { data, error } = await supabase
    .from("registrations")
    .insert({
      user_id: user.id,
      event_id: registration.event_id,
      team_name: registration.team_name,
      team_code: registration.team_code,
      fee: registration.fee,
    })
    .select()
    .single();

  if (error) throw error;

  const registrationId = data.id;

  await supabase
    .from("registration_members")
    .insert(
      members.map((member) => ({
        registration_id: registrationId,
        ...member,
      }))
    );

  return data;
}