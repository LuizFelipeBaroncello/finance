"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

const PluggyConnect = dynamic(
  () => import("react-pluggy-connect").then((m) => m.PluggyConnect),
  { ssr: false },
);
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Account = { account_id: number; account_name: string };
type Status = "idle" | "tokenizing" | "connecting" | "syncing";

export function PluggyImportButton({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState<string>("");
  const [days, setDays] = useState<string>("30");
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function startConnect() {
    setError(null);
    if (!accountId) {
      setError("Selecione a conta de destino.");
      return;
    }
    setStatus("tokenizing");
    try {
      const res = await fetch("/api/pluggy/connect-token", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao obter connect token");
      setConnectToken(json.accessToken);
      setStatus("connecting");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("idle");
    }
  }

  async function handleSuccess(data: { item: { id: string } }) {
    setConnectToken(null);
    setStatus("syncing");
    try {
      const res = await fetch("/api/pluggy/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: data.item.id,
          accountId: Number(accountId),
          days: Number(days),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha na sincronização");
      setOpen(false);
      setStatus("idle");
      router.push("/transactions/review");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("idle");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          Importar do Pluggy
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar via Pluggy (Open Finance)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Conta de destino</label>
              <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.account_id} value={String(a.account_id)}>
                      {a.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Período</label>
              <Select value={days} onValueChange={(v) => setDays(v ?? "30")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Último 1 dia</SelectItem>
                  <SelectItem value="2">Últimos 2 dias</SelectItem>
                  <SelectItem value="3">Últimos 3 dias</SelectItem>
                  <SelectItem value="5">Últimos 5 dias</SelectItem>
                  <SelectItem value="8">Últimos 8 dias</SelectItem>
                  <SelectItem value="13">Últimos 13 dias</SelectItem>
                  <SelectItem value="21">Últimos 21 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={startConnect} disabled={status !== "idle"}>
              {status === "idle" && "Conectar com Pluggy"}
              {status === "tokenizing" && "Preparando..."}
              {status === "connecting" && "Abrindo Pluggy..."}
              {status === "syncing" && "Importando transações..."}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          onSuccess={handleSuccess}
          onError={(e) => {
            setConnectToken(null);
            setStatus("idle");
            setError(e.message ?? "Erro no Pluggy Connect");
          }}
          onClose={() => {
            setConnectToken(null);
            setStatus((s) => (s === "connecting" ? "idle" : s));
          }}
        />
      )}
    </>
  );
}
