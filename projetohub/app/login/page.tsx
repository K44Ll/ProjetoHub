"use client";

import type { FormEvent, MouseEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { safeInternalPath } from "@/lib/safe-redirect";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.code === "email_not_confirmed") {
          setErrorMessage("Confirme seu e-mail antes de entrar.");
        } else if (error.code === "over_request_rate_limit") {
          setErrorMessage("Muitas tentativas. Aguarde um pouco e tente novamente.");
        } else {
          setErrorMessage("E-mail ou senha incorretos.");
        }
        return;
      }

      const requestedPath = new URLSearchParams(window.location.search).get("next");
      const destination = safeInternalPath(requestedPath);
      router.replace(destination);
      router.refresh();
    } catch {
      setErrorMessage("Não foi possível entrar agora. Verifique sua conexão.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCreateAccount(event: MouseEvent<HTMLAnchorElement>) {
    const requestedPath = new URLSearchParams(window.location.search).get("next");
    const destination = safeInternalPath(requestedPath, "");
    if (destination) {
      event.preventDefault();
      router.push(`/cadastro?next=${encodeURIComponent(destination)}`);
    }
  }

  return (
    <AuthShell
      eyebrow="Bem-vindo de volta"
      title="Entre e coloque seu grupo em movimento."
      description="Tarefas, versões e contribuições reunidas em um só lugar."
      note="Seu trabalho continua seu. Nós só ajudamos o grupo a organizá-lo."
    >
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="field-group">
          <label htmlFor="email">E-mail</label>
          <div className="input-wrap">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6.75h16v10.5H4z" />
              <path d="m4.5 7.25 7.5 6 7.5-6" />
            </svg>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="password">Senha</label>
          <div className="input-wrap">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
            </svg>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <PasswordToggle
              showPassword={showPassword}
              onToggle={() => setShowPassword((visible) => !visible)}
            />
          </div>
        </div>

        {errorMessage ? <AuthError message={errorMessage} /> : null}

        <button className="login-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="button-spinner" aria-hidden="true" />
              Entrando...
            </>
          ) : (
            <>
              Entrar no ProjetoHub
              <ArrowIcon />
            </>
          )}
        </button>

        <p className="auth-switch">
          Ainda não tem uma conta?{" "}
          <Link href="/cadastro" onClick={handleCreateAccount}>Criar conta</Link>
        </p>
      </form>
    </AuthShell>
  );
}

function PasswordToggle({
  onToggle,
  showPassword,
}: {
  onToggle: () => void;
  showPassword: boolean;
}) {
  return (
    <button
      className="password-toggle"
      type="button"
      onClick={onToggle}
      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
      aria-pressed={showPassword}
    >
      {showPassword ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 3 18 18" />
          <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
          <path d="M9.9 4.25A10 10 0 0 1 12 4c5.5 0 9 5 9 8a8.6 8.6 0 0 1-2 3.8M6.6 6.6C4.3 8 3 10.2 3 12c0 3 3.5 8 9 8 1.4 0 2.7-.33 3.8-.86" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12c0-3 3.5-8 9-8s9 5 9 8-3.5 8-9 8-9-5-9-8Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      )}
    </button>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <p className="login-error" role="alert">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.25M12 16.5h.01" />
      </svg>
      {message}
    </p>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}
