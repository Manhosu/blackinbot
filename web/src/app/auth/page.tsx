import { AuthForm } from "@/components/AuthForm";

// Forçar renderização dinâmica
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AuthPage() {
  return (
    <main className="min-h-screen">
      <AuthForm />
    </main>
  );
} 