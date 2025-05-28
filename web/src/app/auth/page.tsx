'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { AuthForm } from "@/components/AuthForm";

export default function AuthPage() {
  return (
    <main className="min-h-screen">
      <AuthForm />
    </main>
  );
} 