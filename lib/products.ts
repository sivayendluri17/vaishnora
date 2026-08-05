// Shared Product type. Catalog data now lives in Postgres (see lib/products-db.ts).
export type Product = {
  id: string;
  name: string;
  category: string; // "Sarees" | "Dresses" | "Ethnic Wear"
  price: number; // INR
  fabric: string;
  description: string;
  swatch: string | null;   // CSS gradient fallback when no photo yet
  imageUrl: string | null; // S3 photo URL
};
