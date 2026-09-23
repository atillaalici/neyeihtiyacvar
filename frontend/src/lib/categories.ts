import type { LucideIcon } from "lucide-react";
import {
  Wrench,
  Home,
  Truck,
  Laptop,
  Car,
  GraduationCap,
  PartyPopper,
  LayoutGrid,
} from "lucide-react";

export type CategoryDto = {
  id: string;
  slug: string;
  name: string;
  services: string[];
};

export type CategoryViewModel = CategoryDto & {
  icon: LucideIcon;
};

const categoryIcons: Record<string, LucideIcon> = {
  "usta-tamir": Wrench,
  "ev-yasam": Home,
  "nakliye-tasima": Truck,
  "teknoloji-yazilim": Laptop,
  otomotiv: Car,
  egitim: GraduationCap,
  organizasyon: PartyPopper,
  diger: LayoutGrid,
};

export function withCategoryIcons(
  categories: CategoryDto[],
): CategoryViewModel[] {
  return categories.map((category) => ({
    ...category,
    icon: categoryIcons[category.slug] ?? LayoutGrid,
  }));
}
