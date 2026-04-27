import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { RuleForm } from "./components/rule-form";
import { RulesTable } from "./components/rules-table";

export default async function ClassificationRulesPage() {
  const supabase = await createClient();

  const [{ data: rules }, { data: categories }] = await Promise.all([
    supabase
      .from("classification_rule")
      .select("rule_id, pattern, category_id, priority")
      .order("priority", { ascending: false })
      .order("pattern", { ascending: true }),
    supabase
      .from("category")
      .select("category_id, category_name, type")
      .order("category_name"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regras de classificação"
        description={
          <span>
            Padrões que classificam automaticamente transações importadas •{" "}
            <Link
              href="/transactions"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Transações
            </Link>
          </span>
        }
        action={<RuleForm categories={categories ?? []} />}
      />

      <RulesTable rules={rules ?? []} categories={categories ?? []} />
    </div>
  );
}
