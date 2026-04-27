import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { ImportWizard } from "./components/import-wizard";

export default async function ImportTransactionsPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: categories }, { data: rules }] = await Promise.all([
    supabase
      .from("account")
      .select("account_id, account_name")
      .order("account_name"),
    supabase
      .from("category")
      .select("category_id, category_name, type")
      .order("category_name"),
    supabase
      .from("classification_rule")
      .select("rule_id, pattern, category_id, priority")
      .order("priority", { ascending: false })
      .order("pattern", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar transações"
        description={
          <span>
            Upload do extrato CSV, revisão das classificações e envio para o banco •{" "}
            <Link href="/transactions" className="underline underline-offset-2 hover:text-foreground">
              Voltar para transações
            </Link>
          </span>
        }
      />
      <ImportWizard
        accounts={accounts ?? []}
        categories={categories ?? []}
        initialRules={rules ?? []}
      />
    </div>
  );
}
