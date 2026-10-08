export type Seo = {
  title: string;
  description: string;
  index: boolean;
  follow: boolean;
  og_image: string | null;
};

export type Contact = {
  type: string;
  value: string | null;
  template: string | null;
  label: string;
};

export type TenantPublic = {
  name: string;
  trade_name: string;
  slug: string;
  description: string | null;
  primary_color: string;
  secondary_color: string;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  address: string | null;
  business_hours: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  language: string;
  city: string | null;
  state: string | null;
  country: string | null;
  indexing_enabled: boolean;
  currency: string;
  contact: Contact;
  seo: Seo;
  font_pair?: string;
  hero_text?: string | null;
  section_order?: string[];
};

export type IntegrationPublic = { provider: string; public_id: string };

export type ProductImage = { url: string | null; thumb_url: string | null; alt: string | null };

export type ProductCard = {
  name: string;
  slug: string;
  short_description: string | null;
  brand: string | null;
  is_featured: boolean;
  price_visible: boolean;
  price: number | null;
  promotional_price?: number | null;
  on_promotion?: boolean;
  on_clearance?: boolean;
  clearance_label?: string | null;
  image: ProductImage | null;
  seo: Seo;
};

export type SitePayload = {
  tenant: TenantPublic;
  integrations?: IntegrationPublic[];
  banners: { title: string; url: string | null; desktop_url: string | null; mobile_url: string | null }[];
  categories: { name: string; slug: string; description: string | null; image_url?: string | null }[];
  featured_products: ProductCard[];
  promotions: ProductCard[];
  clearance: ProductCard[];
  pages: { title: string; slug: string }[];
  ads?: { id: string; title: string; url: string | null; position: string; image_url: string | null }[];
};

export type ProductDetail = ProductCard & {
  description: string | null;
  stock_display: string | null;
  images: ProductImage[];
  category_slug?: string | null;
  category_name?: string | null;
  json_ld?: unknown;
};

export type ProductPage = { items: ProductCard[]; page: number; limit: number; total: number };
