import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PublicShop from "./PublicShop";
import { trpc } from "@/lib/trpc";

// Mock trpc
vi.mock("@/lib/trpc", () => ({
  trpc: {
    publicShop: {
      get: {
        useQuery: vi.fn(),
      },
    },
    checkout: {
      quote: {
        useQuery: vi.fn(),
      },
      create: {
        useMutation: vi.fn(),
      },
    },
  },
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockPublicShopQuery = vi.mocked(trpc.publicShop.get.useQuery);
const mockCheckoutQuote = vi.mocked(trpc.checkout.quote.useQuery);
const mockCheckoutCreate = vi.mocked(trpc.checkout.create.useMutation);

const mockBusiness = {
  id: 1,
  name: "Test Shop",
  slug: "test-shop",
  description: "Boutique de test",
  contactEmail: "test@shop.com",
  contactPhone: "0123456789",
  accentColor: "#0F766E",
  logoUrl: null,
};

const mockCategories = [
  { id: 1, name: "Catégorie A", isActive: true },
  { id: 2, name: "Catégorie B", isActive: true },
];

const mockProducts = [
  {
    id: 1,
    name: "Produit 1",
    priceCents: 1000,
    categoryId: 1,
    shortDescription: "Description courte",
    description: "Description complète",
  },
  {
    id: 2,
    name: "Produit 2",
    priceCents: 2000,
    categoryId: 2,
    shortDescription: null,
    description: "Description produit 2",
  },
];

const mockPromotions = [];

describe("PublicShop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockCheckoutQuote.mockReturnValue({
      data: { subtotalCents: 0, discountCents: 0, totalCents: 0 },
      isLoading: false,
    } as any);

    mockCheckoutCreate.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });

  it("affiche l'état de chargement", () => {
    mockPublicShopQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<PublicShop slug="test-shop" />);
    expect(screen.getByText(/chargement de la boutique/i)).toBeInTheDocument();
  });

  it("affiche la page boutique indisponible en cas d'erreur", () => {
    mockPublicShopQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Not found"),
    } as any);

    render(<PublicShop slug="test-shop" />);
    expect(screen.getByText(/boutique indisponible/i)).toBeInTheDocument();
    expect(screen.getByText(/cette vitrine n.existe pas/i)).toBeInTheDocument();
  });

  it("affiche le nom de la boutique et les produits", async () => {
    mockPublicShopQuery.mockReturnValue({
      data: {
        business: mockBusiness,
        categories: mockCategories,
        products: mockProducts,
        promotions: mockPromotions,
      },
      isLoading: false,
      error: null,
    } as any);

    render(<PublicShop slug="test-shop" />);

    await waitFor(() => {
      expect(screen.getByText("Test Shop")).toBeInTheDocument();
      expect(screen.getByText("Produit 1")).toBeInTheDocument();
      expect(screen.getByText("Produit 2")).toBeInTheDocument();
    });
  });

  it("affiche les catégories dans les pills", async () => {
    mockPublicShopQuery.mockReturnValue({
      data: {
        business: mockBusiness,
        categories: mockCategories,
        products: mockProducts,
        promotions: mockPromotions,
      },
      isLoading: false,
      error: null,
    } as any);

    render(<PublicShop slug="test-shop" />);

    await waitFor(() => {
      const catAElements = screen.getAllByText("Catégorie A");
      const catBElements = screen.getAllByText("Catégorie B");
      expect(catAElements.length).toBeGreaterThanOrEqual(1);
      expect(catBElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("ajoute un produit au panier", async () => {
    mockPublicShopQuery.mockReturnValue({
      data: {
        business: mockBusiness,
        categories: mockCategories,
        products: mockProducts,
        promotions: mockPromotions,
      },
      isLoading: false,
      error: null,
    } as any);

    render(<PublicShop slug="test-shop" />);

    await waitFor(() => {
      expect(screen.getByText("Produit 1")).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole("button", { name: /ajouter/i });
    fireEvent.click(addButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  it("ouvre le dialogue de checkout quand on clique sur le panier", async () => {
    mockPublicShopQuery.mockReturnValue({
      data: {
        business: mockBusiness,
        categories: mockCategories,
        products: mockProducts,
        promotions: mockPromotions,
      },
      isLoading: false,
      error: null,
    } as any);

    render(<PublicShop slug="test-shop" />);

    await waitFor(() => {
      expect(screen.getByText("Panier")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Panier"));

    await waitFor(() => {
      expect(screen.getByText("Votre commande")).toBeInTheDocument();
    });
  });

  it("affiche le formulaire de checkout après ajout au panier", async () => {
    mockPublicShopQuery.mockReturnValue({
      data: {
        business: mockBusiness,
        categories: mockCategories,
        products: mockProducts,
        promotions: mockPromotions,
      },
      isLoading: false,
      error: null,
    } as any);

    render(<PublicShop slug="test-shop" />);

    // Ajouter un produit au panier d'abord
    await waitFor(() => {
      expect(screen.getByText("Produit 1")).toBeInTheDocument();
    });
    
    const addButtons = screen.getAllByRole("button", { name: /ajouter/i });
    fireEvent.click(addButtons[0]);

    // Attendre que le panier affiche la quantité
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    // Ouvrir le panier
    fireEvent.click(screen.getByText("Panier"));

    // Le formulaire doit maintenant s'afficher (panier non vide)
    // Utiliser des labels exacts pour éviter les conflits Prénom/Nom
    await waitFor(() => {
      expect(screen.getByLabelText("Prénom")).toBeInTheDocument();
      expect(screen.getByLabelText("Nom")).toBeInTheDocument();
      expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
      expect(screen.getByLabelText("Téléphone")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /envoyer ma commande/i })).toBeInTheDocument();
    });
  });

  it("gère l'affichage des promotions", async () => {
    mockPublicShopQuery.mockReturnValue({
      data: {
        business: mockBusiness,
        categories: mockCategories,
        products: mockProducts,
        promotions: [{ id: 1, name: "Promo test" }],
      },
      isLoading: false,
      error: null,
    } as any);

    render(<PublicShop slug="test-shop" />);

    await waitFor(() => {
      expect(screen.getByText(/1 offre active/i)).toBeInTheDocument();
    });
  });
});
