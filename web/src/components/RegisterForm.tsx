"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import "../styles/auth-form.css";

// Funções de formatação
const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .slice(0, 14);
};

const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15);
};

// Schema de validação
const registerSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  cpf: z.string().min(11, "CPF deve ter 11 dígitos"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  
  // Debug log
  React.useEffect(() => {
    console.log('🔧 RegisterForm inicializado com sucesso!');
  }, []);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      cpf: "",
    }
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setLoading(true);
      setSuccess("");
      setError("");
      
      console.log('📝 Enviando dados para API de registro...');
      console.log('📊 Dados validados:', {
        name: data.name,
        email: data.email,
            phone: data.phone,
        cpf: data.cpf,
        hasPassword: !!data.password
      });

      // Fazer requisição para a API de registro
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
          cpf: data.cpf,
        }),
      });

      console.log('📡 Resposta da API status:', response.status);
      
      const result = await response.json();
      console.log('📥 Resultado da API:', result);

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao criar conta');
      }

      console.log('✅ Conta criada com sucesso:', result);
      setSuccess("Cadastro realizado com sucesso! Redirecionando para login...");
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (err: any) {
      console.error("❌ Erro ao cadastrar:", err);
      setError(err?.message || "Erro ao cadastrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ position: 'relative', zIndex: 100, marginTop: '-30px' }}>
      <div className="auth-card-switch">
        <div className="auth-flip-card__back">
          <div className="auth-title">Cadastro</div>
          <form className="auth-flip-card__form" onSubmit={handleSubmit(onSubmit)}>
            <input
              {...register("name")}
              className="auth-flip-card__input"
              placeholder="Nome"
              type="text"
            />
            {errors.name && <span className="text-red-500 text-sm">{errors.name.message}</span>}
            
            <input
              {...register("email")}
              className="auth-flip-card__input"
              placeholder="Email"
              type="email"
            />
            {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
            
            <input
              {...register("password")}
              className="auth-flip-card__input"
              placeholder="Senha"
              type="password"
            />
            {errors.password && <span className="text-red-500 text-sm">{errors.password.message}</span>}
            
            <input
              {...register("phone")}
              className="auth-flip-card__input"
              placeholder="Celular"
              type="text"
              onChange={(e) => setValue("phone", formatPhone(e.target.value))}
              value={watch("phone")}
            />
            {errors.phone && <span className="text-red-500 text-sm">{errors.phone.message}</span>}
            
            <input
              {...register("cpf")}
              className="auth-flip-card__input"
              placeholder="CPF"
              type="text"
              onChange={(e) => setValue("cpf", formatCPF(e.target.value))}
              value={watch("cpf")}
            />
            {errors.cpf && <span className="text-red-500 text-sm">{errors.cpf.message}</span>}
            
            <button className="auth-flip-card__btn" type="submit" disabled={loading}>
              {loading ? "Cadastrando..." : "Cadastrar"}
            </button>
            
            {success && <div className="text-green-500 mt-2 text-sm">{success}</div>}
            {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
          </form>
        </div>
      </div>
    </div>
  );
} 