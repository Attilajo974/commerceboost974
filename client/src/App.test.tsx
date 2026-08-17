import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "./App";

// Mock useAuth
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/_core/hooks/useAuth";

const mockUseAuth = vi.mocked(useAuth);

describe("App - Page publique", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it("affiche la page Home par défaut", () => {
    render(<App />);
    
    // Récupérer tous les liens contenant "CommerceBoost"
    const brandLinks = screen.getAllByRole("link", { name: /commerceboost/i });
    
    // Le premier doit être le logo/marque avec href="/"
    expect(brandLinks.length).toBeGreaterThan(0);
    expect(brandLinks[0]).toHaveAttribute("href", "/");
    expect(brandLinks[0]).toHaveClass("cb-brand");
  });

  it("affiche le bouton de connexion dans la navigation", () => {
    render(<App />);
    
    const loginButton = screen.getByRole("button", { name: /se connecter/i });
    expect(loginButton).toBeInTheDocument();
  });

  it("affiche le titre principal de la landing page", () => {
    render(<App />);
    
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/développez votre activité/i);
  });

  it("affiche les sections de navigation principales", () => {
    render(<App />);
    
    expect(screen.getByRole("link", { name: /la solution/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /fonctionnalités/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /tarifs/i })).toBeInTheDocument();
  });

  it("gère l'état de chargement sans crasher", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      isAuthenticated: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });

    expect(() => render(<App />)).not.toThrow();
    expect(document.body).toBeInTheDocument();
  });

  it("gère les erreurs d'authentification sans crasher", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      error: new Error("Auth failed"),
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });

    expect(() => render(<App />)).not.toThrow();
    expect(document.body).toBeInTheDocument();
  });
});
