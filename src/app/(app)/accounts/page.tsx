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
  const { data: accounts } = await supabase
    .from("account")
    .select("*")
    .order("account_name")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas"
        description="Gerencie suas contas bancárias e carteiras"
        action={<AccountForm />}
      />
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!accounts?.length && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  Nenhuma conta cadastrada
                </TableCell>
              </TableRow>
            )}
            {accounts?.map((account) => (
              <TableRow key={account.account_id}>
                <TableCell className="font-medium">{account.account_name}</TableCell>
                <TableCell className="text-muted-foreground">{account.description || "—"}</TableCell>
                <TableCell>
                  <AccountForm account={account} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
