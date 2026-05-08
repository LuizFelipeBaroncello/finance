import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { ProvisionalBanner } from "@/components/provisional-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: client } = await supabase.from("client").select("client_id").maybeSingle();
  if (!client) {
    await supabase.from("client").insert({
      client_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Usuário",
      email: user.email!,
      auth_user_id: user.id,
    });
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const dismissed = cookieStore.has("provisional_review_seen");
  const pathname = headerStore.get("x-pathname") ?? "";
  const onReviewPage = pathname.startsWith("/transactions/review");

  const { count: provisionalCount } = await supabase
    .from("transaction")
    .select("trans_id", { count: "exact", head: true })
    .eq("is_provisional", true);

  if ((provisionalCount ?? 0) > 0 && !dismissed && !onReviewPage) {
    redirect("/transactions/review");
  }

  const userName =
    user.user_metadata?.full_name ??
    user.email?.split("@")[0] ??
    "Usuário";
  const userEmail = user.email ?? "";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ProvisionalBanner count={provisionalCount ?? 0} />
        <Header userName={userName} userEmail={userEmail} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
