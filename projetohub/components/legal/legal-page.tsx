import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ThemeControl } from "@/components/theme-control";

type LegalSectionLink = {
  id: string;
  label: string;
};

type LegalPageProps = {
  children: ReactNode;
  currentPage: "privacy" | "terms";
  description: string;
  eyebrow: string;
  sections: LegalSectionLink[];
  title: string;
  updatedAt: string;
};

export function LegalPage({
  children,
  currentPage,
  description,
  eyebrow,
  sections,
  title,
  updatedAt,
}: LegalPageProps) {
  return (
    <main className="legal-shell">
      <div className="legal-glow legal-glow-one" aria-hidden="true" />
      <div className="legal-glow legal-glow-two" aria-hidden="true" />
      <div className="legal-grid" aria-hidden="true" />

      <header className="legal-header">
        <Link className="brand" href="/" aria-label="ProjetoHub — página inicial">
          <BrandMark />
          <span>ProjetoHub</span>
        </Link>

        <nav className="legal-header-nav" aria-label="Documentos legais">
          <Link
            href="/privacy-police"
            aria-current={currentPage === "privacy" ? "page" : undefined}
          >
            Privacidade
          </Link>
          <Link
            href="/terms-of-service"
            aria-current={currentPage === "terms" ? "page" : undefined}
          >
            Termos de serviço
          </Link>
        </nav>

        <ThemeControl />
      </header>

      <div className="legal-container">
        <header className="legal-hero">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="legal-updated">
            <span>Última atualização</span>
            <time dateTime="2026-08-15">{updatedAt}</time>
          </div>
        </header>

        <nav className="legal-toc" aria-label="Nesta página">
          <strong>Nesta página</strong>
          <div>
            {sections.map((section) => (
              <Link key={section.id} href={`#${section.id}`}>
                {section.label}
              </Link>
            ))}
          </div>
        </nav>

        <article className="legal-document">{children}</article>

        <footer className="legal-footer">
          <div>
            <BrandMark />
            <p>
              ProjetoHub
              <span>Organização clara para equipes e projetos.</span>
            </p>
          </div>
          <nav aria-label="Links do rodapé">
            <Link href="/login">Entrar</Link>
            <Link href="/privacy-police">Privacidade</Link>
            <Link href="/terms-of-service">Termos</Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
