"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createRule(formData: FormData) {
  const supabase = await createClient();
  const { data: client } = await supabase.from("client").select("client_id").single();
  if (!client) return { error: "Não autorizado" };

  const { error } = await supabase.from("classification_rule").insert({
    client_id: client.client_id,
    pattern: formData.get("pattern") as string,
    category_id: Number(formData.get("category_id")),
    priority: Number(formData.get("priority") ?? 0),
  });
  if (error) return { error: error.message };
  revalidatePath("/classification-rules");
}

export async function updateRule(id: number, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("classification_rule")
    .update({
      pattern: formData.get("pattern") as string,
      category_id: Number(formData.get("category_id")),
      priority: Number(formData.get("priority") ?? 0),
    })
    .eq("rule_id", id);
  if (error) return { error: error.message };
  revalidatePath("/classification-rules");
}

export async function deleteRule(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("classification_rule").delete().eq("rule_id", id);
  if (error) return { error: error.message };
  revalidatePath("/classification-rules");
}

export async function deleteRulesBulk(ids: number[]) {
  if (ids.length === 0) return {};
  const supabase = await createClient();
  const { error } = await supabase
    .from("classification_rule")
    .delete()
    .in("rule_id", ids);
  if (error) return { error: error.message };
  revalidatePath("/classification-rules");
}
