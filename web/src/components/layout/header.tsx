import React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { getInitials } from '@/lib/utils';

interface HeaderProps {
  user: {
    name: string;
    avatar?: string;
  };
}

export function Header({ user }: HeaderProps) {
  return (
    <div className="h-16 bg-primary flex items-center justify-end px-6 border-b border-border fixed top-0 right-0 left-64 z-10">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
            ) : (
              <span>{getInitials(user.name)}</span>
            )}
          </div>
          <span className="text-white">{user.name}</span>
          <ChevronDown size={16} className="text-white opacity-75" />
        </div>
      </div>
    </div>
  );
} 