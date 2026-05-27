export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 px-safe py-safe">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
