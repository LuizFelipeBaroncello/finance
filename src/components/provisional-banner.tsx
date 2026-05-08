import Link from "next/link";

export function ProvisionalBanner({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div className="bg-amber-100 text-amber-900 px-4 py-2 text-sm flex items-center justify-between border-b border-amber-200">
      <span>
        Você tem {count} {count === 1 ? "transação" : "transações"} para classificar.
      </span>
      <Link href="/transactions/review" className="underline font-medium">
        Revisar agora
      </Link>
    </div>
  );
}
