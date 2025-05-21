import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Users, 
  Gift, 
  ShoppingCart, 
  Megaphone, 
  Wallet 
} from 'lucide-react';

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

const SidebarLink = ({ href, icon, label }: SidebarLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
      <span className="sidebar-icon">{icon}</span>
      <span>{label}</span>
    </Link>
  );
};

export function Sidebar() {
  return (
    <div className="w-64 h-screen bg-primary flex flex-col fixed left-0 top-0 border-r border-border">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Black-in-Bot" width={36} height={36} />
          <span className="text-white text-xl font-bold">Black-in-Bot</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <SidebarLink
          href="/dashboard"
          icon={<LayoutDashboard size={20} />}
          label="Visão geral"
        />
        <SidebarLink
          href="/bots"
          icon={<Users size={20} />}
          label="Meus bots"
        />
        <SidebarLink
          href="/affiliate"
          icon={<Gift size={20} />}
          label="Indique e ganhe"
        />
        <SidebarLink
          href="/sales"
          icon={<ShoppingCart size={20} />}
          label="Minhas vendas"
        />
        <SidebarLink
          href="/remarketing"
          icon={<Megaphone size={20} />}
          label="Remarketing"
        />
        <SidebarLink
          href="/financial"
          icon={<Wallet size={20} />}
          label="Financeiro"
        />
      </nav>
    </div>
  );
} 