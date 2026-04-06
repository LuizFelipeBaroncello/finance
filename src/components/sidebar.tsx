"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Home,
  Car,
  CreditCard,
  ArrowLeftRight,
  Building2,
  ChevronDown,
  Coins,
  Wallet,
  Tag,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
};

const NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Investimentos",
    icon: Coins,
    children: [
      { label: "Renda Fixa", href: "/fixed-income", icon: TrendingUp },
      { label: "Renda Variável", href: "/variable-income", icon: BarChart3 },
    ],
  },
  {
    label: "Patrimônio",
    icon: Home,
    children: [
      { label: "Imóveis", href: "/real-estate", icon: Home },
      { label: "Veículos", href: "/vehicles", icon: Car },
    ],
  },
  { label: "Passivos", href: "/liabilities", icon: CreditCard },
  { label: "Transações", href: "/transactions", icon: ArrowLeftRight },
  { label: "Analytics", href: "/analytics", icon: BarChart2 },
  {
    label: "Configurações",
    icon: Building2,
    children: [
      { label: "Instituições", href: "/institutions", icon: Building2 },
      { label: "Contas", href: "/accounts", icon: Wallet },
      { label: "Categorias", href: "/categories", icon: Tag },
    ],
  },
];

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = item.href ? pathname.startsWith(item.href) : false;
  const Icon = item.icon;

  if (item.children) {
    const isGroupActive = item.children.some(
      (child) => child.href && pathname.startsWith(child.href)
    );
    return (
      <div>
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground",
            isGroupActive && "text-foreground"
          )}
        >
          {Icon && <Icon className="size-4 shrink-0" />}
          <span>{item.label}</span>
          <ChevronDown className="ml-auto size-3.5 opacity-50" />
        </div>
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
          {item.children.map((child) => (
            <NavLink key={child.href} item={child} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      <span>{item.label}</span>
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 px-2 py-4">
      {NAV.map((item) => (
        <NavLink key={item.label} item={item} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col border-r border-border bg-sidebar h-screen sticky top-0">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <span className="font-semibold text-foreground tracking-tight">
          Feed Level
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
    </aside>
  );
}
