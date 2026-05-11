import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPluggyClient } from "@/lib/pluggy/client";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const pluggy = getPluggyClient();
    const connectToken = await pluggy.createConnectToken(undefined, {
      clientUserId: user.id,
    });
    return NextResponse.json({ accessToken: connectToken.accessToken });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao criar connect token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
