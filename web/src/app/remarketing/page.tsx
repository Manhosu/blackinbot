'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RemarketingPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirecionar para a página de marketing no dashboard
    router.replace('/dashboard/marketing');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
    </div>
  );
} 
