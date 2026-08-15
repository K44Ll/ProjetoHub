"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeControl } from "@/components/theme-control";

type AuthShellProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  note: string;
  title: string;
};

export function AuthShell({
  children,
  description,
  eyebrow,
  note,
  title,
}: AuthShellProps) {
  return (
    <main className="login-shell">
      <div className="login-glow login-glow-one" aria-hidden="true" />
      <div className="login-glow login-glow-two" aria-hidden="true" />
      <div className="login-grid" aria-hidden="true" />

      <header className="login-header">
        <Link className="brand" href="/" aria-label="ProjetoHub — página inicial">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>ProjetoHub</span>
        </Link>

        <ThemeControl />
      </header>

      <section className="login-content">
        <div className="login-form-column">
          <div className="login-intro">
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          {children}

          <p className="login-note">{note}</p>
        </div>

        <ProductOverview />
      </section>
    </main>
  );
}

function ProductOverview() {
  return (
    <aside className="login-visual" aria-label="Visão geral do ProjetoHub">
      <div className="visual-copy">
        <span className="visual-kicker">Trabalho em grupo, sem o caos</span>
        <h2>Todo mundo sabe o que fazer. E o que já foi feito.</h2>
      </div>

      <div className="product-overview">
        <div className="product-feature">
          <span>01</span>
          <div>
            <strong>Equipes conectadas</strong>
            <p>Integrantes, responsabilidades e projetos no mesmo espaço.</p>
          </div>
        </div>
        <div className="product-feature">
          <span>02</span>
          <div>
            <strong>Prazos visíveis</strong>
            <p>Entregas organizadas para o grupo saber o que vem a seguir.</p>
          </div>
        </div>
        <div className="product-feature">
          <span>03</span>
          <div>
            <strong>Histórico confiável</strong>
            <p>Atividades e contribuições vinculadas aos dados reais do projeto.</p>
          </div>
        </div>
        <div className="product-data-note">
          <span className="activity-pulse" aria-hidden="true" />
          <span>Dados vinculados à sua conta e às suas equipes</span>
        </div>
      </div>

      <p className="visual-footnote">
        Organização clara. Histórico recuperável. Contribuições visíveis.
      </p>
    </aside>
  );
}
