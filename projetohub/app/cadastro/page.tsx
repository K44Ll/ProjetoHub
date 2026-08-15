"use client";

import type { FormEvent, MouseEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { safeInternalPath } from "@/lib/safe-redirect";
import { createClient } from "@/utils/supabase/client";

export default function CadastroPage() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Sua senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      const requestedPath = new URLSearchParams(window.location.search).get("next");
      const safeNextPath = safeInternalPath(requestedPath, "");
      const loginRedirect = safeNextPath
        ? `/login?next=${encodeURIComponent(safeNextPath)}`
        : "/login";
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}${loginRedirect}`,
        },
      });

      if (error) {
        if (error.code === "weak_password") {
          setErrorMessage("Escolha uma senha mais forte.");
        } else if (error.code === "over_email_send_rate_limit") {
          setErrorMessage("Muitas tentativas. Aguarde um pouco e tente novamente.");
        } else if (error.code === "email_address_invalid") {
          setErrorMessage("Digite um endereço de e-mail válido.");
        } else {
          setErrorMessage("Não foi possível criar sua conta agora.");
        }
        return;
      }

      setAccountCreated(true);
    } catch {
      setErrorMessage("Não foi possível criar sua conta. Verifique sua conexão.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function preserveReturnPath(event: MouseEvent<HTMLAnchorElement>) {
    const requestedPath = new URLSearchParams(window.location.search).get("next");
    const destination = safeInternalPath(requestedPath, "");
    if (destination) {
      event.preventDefault();
      router.push(`/login?next=${encodeURIComponent(destination)}`);
    }
  }

  return (
    <AuthShell
      eyebrow="Comece por aqui"
      title="Crie seu espaço para fazer junto."
      description="Organize o próximo trabalho desde a primeira tarefa até a entrega final."
      note="O ProjetoHub registra o processo para tornar cada contribuição visível."
    >
      {accountCreated ? (
        <section className="login-card signup-success" aria-live="polite">
          <span className="success-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m6.5 12.5 3.3 3.3L17.8 8" />
            </svg>
          </span>
          <div>
            <span className="success-eyebrow">Cadastro recebido</span>
            <h2>Confira seu e-mail.</h2>
            <p>
              Enviamos um link para confirmar sua conta. Depois da confirmação,
              você poderá entrar no ProjetoHub.
            </p>
          </div>
          <Link className="login-button" href="/login" onClick={preserveReturnPath}>
            Voltar para o login
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M14 7l5 5-5 5" />
            </svg>
          </Link>
        </section>
      ) : (
        <form className="login-card signup-card" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="full-name">Nome</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="3.25" />
                <path d="M5.5 19c.5-3.5 2.7-5.25 6.5-5.25S18 15.5 18.5 19" />
              </svg>
              <input
                id="full-name"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Como podemos chamar você?"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                minLength={2}
                maxLength={100}
                required
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="signup-email">E-mail</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6.75h16v10.5H4z" />
                <path d="m4.5 7.25 7.5 6 7.5-6" />
              </svg>
              <input
                id="signup-email"
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

          <div className="signup-password-grid">
            <div className="field-group">
              <label htmlFor="signup-password">Senha</label>
              <div className="input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="10" rx="2" />
                  <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
                </svg>
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-describedby="password-hint"
                  minLength={8}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Ocultar senhas" : "Mostrar senhas"}
                  aria-pressed={showPassword}
                >
                  <PasswordEye visible={showPassword} />
                </button>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="confirm-password">Confirmar senha</label>
              <div className="input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="10" rx="2" />
                  <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
                </svg>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repita sua senha"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </div>
          </div>

          <p className="password-hint" id="password-hint">
            Use pelo menos 8 caracteres.
          </p>

          {errorMessage ? (
            <p className="login-error" role="alert">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5v5.25M12 16.5h.01" />
              </svg>
              {errorMessage}
            </p>
          ) : null}

          <button className="login-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Criando conta...
              </>
            ) : (
              <>
                Criar minha conta
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M14 7l5 5-5 5" />
                </svg>
              </>
            )}
          </button>

          <p className="auth-switch">
            Já tem uma conta?{" "}
            <Link href="/login" onClick={preserveReturnPath}>Entrar</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

function PasswordEye({ visible }: { visible: boolean }) {
  return visible ? (
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
  );
}
