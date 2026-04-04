"use client";

import { useState } from "react";
import { Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/sidebar";
import { logout } from "@/app/(auth)/actions";

type HeaderProps = {
  userName: string;
  userEmail: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function Header({ userName, userEmail }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-4 lg:px-6 sticky top-0 z-10">
      {/* Mobile menu trigger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="size-5" />
        <span className="sr-only">Abrir menu</span>
      </Button>

      {/* Brand (mobile only) */}
      <span className="font-semibold text-foreground tracking-tight lg:hidden">
        Feed Level
      </span>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 gap-2 px-2" />}>
            <Avatar className="size-6">
              <AvatarFallback className="text-xs">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:block">
              {userName}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={6}>
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {userName}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {userEmail}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="size-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => logout()}
            >
              <LogOut className="size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b border-border px-5 py-3.5">
            <SheetTitle className="text-left">Feed Level</SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
