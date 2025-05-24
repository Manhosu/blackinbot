import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { getInitials } from '@/lib/utils';

interface HeaderProps {
  user: {
    name: string;
    avatar?: string;
  };
}

export function Header({ user }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fechar o menu ao clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Redirecionar para a página de login
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="h-16 bg-primary flex items-center justify-end px-6 border-b border-border fixed top-0 right-0 left-64 z-10">
      <div className="flex items-center gap-2 relative" ref={menuRef}>
        <div 
          className="flex items-center gap-2 cursor-pointer py-2 px-3 rounded-full hover:bg-white/5 transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
            ) : (
              <span>{getInitials(user.name)}</span>
            )}
          </div>
          <span className="text-white">{user.name}</span>
          <ChevronDown size={16} className={`text-white opacity-75 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
        </div>

        {isMenuOpen && (
          <div className="absolute top-full right-0 mt-2 py-2 w-56 rounded-lg bg-card border border-border shadow-lg z-20">
            <Link 
              href="/profile" 
              className="flex items-center gap-3 px-4 py-2 text-white hover:bg-white/5 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <User size={16} className="opacity-75" />
              <span>Meu Perfil</span>
            </Link>
            <Link 
              href="/settings" 
              className="flex items-center gap-3 px-4 py-2 text-white hover:bg-white/5 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <Settings size={16} className="opacity-75" />
              <span>Configurações</span>
            </Link>
            <div className="border-t border-border my-1"></div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2 text-white hover:bg-white/5 transition-colors w-full text-left"
            >
              <LogOut size={16} className="opacity-75" />
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 