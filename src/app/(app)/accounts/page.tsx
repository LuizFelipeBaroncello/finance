import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AccountForm } from "./components/account-form"

export default async function AccountsPage() {
  const supabase = await createClient()
  const [{ data: accounts }, { data: institutions }] = await Promise.all([
    supabase
      .from("account")
      .select("account_id, account_name, description, institution_id, institution(name)")
      .order("account_name"),
    supabase
      .from("institution")
      .select("institution_id, name")
      .order("name"),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas"
        description="Gerencie suas contas bancárias e carteiras"
        action={<AccountForm institutions={institutions ?? []} />}
      />
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instituição</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!accounts?.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhuma conta cadastrada
                </TableCell>
              </TableRow>
            )}
            {accounts?.map((account) => (
              <TableRow key={account.account_id}>
                <TableCell className="text-muted-foreground">
                  {(account.institution as { name: string } | null)?.name ?? "—"}
                </TableCell>
                <TableCell className="font-medium">{account.account_name}</TableCell>
                <TableCell className="text-muted-foreground">{account.description || "—"}</TableCell>
                <TableCell>
                  <AccountForm
                    account={account}
                    institutions={institutions ?? []}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
