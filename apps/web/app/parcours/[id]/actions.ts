"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleEtapeComplete(
  parcoursId: string,
  etapeIndex: number,
  current: number[]
): Promise<number[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const isDone = current.includes(etapeIndex);
  const next = isDone
    ? current.filter((i) => i !== etapeIndex)
    : [...current, etapeIndex];

  await supabase
    .from("parcours")
    .update({ etapes_completees: next })
    .eq("id", parcoursId)
    .eq("user_id", user.id);

  revalidatePath(`/parcours/${parcoursId}`);
  return next;
}
