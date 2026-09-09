import Link from "next/link";

import type { CategoryViewModel } from "@/lib/categories";

export function CategoryCard({
  category,
}: {
  category: CategoryViewModel;
}) {
  const Icon = category.icon;

  return (
    <Link
      href={`/kategoriler#${category.slug}`}
      className="home-category-card group flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lift"
    >
      <span className="grid size-13 place-items-center rounded-xl bg-accent/70 text-accent-foreground transition-colors duration-200 group-hover:bg-accent group-hover:text-primary">
        <Icon
          className="size-6"
          aria-hidden="true"
        />
      </span>

      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight transition-colors duration-200 group-hover:text-primary">
        {category.name}
      </h3>

      <ul className="mt-3 space-y-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground/90">
        {category.services.slice(0, 4).map((service) => (
          <li key={service}>
            {service}
          </li>
        ))}
      </ul>

      {category.services.length > 4 && (
        <span className="mt-auto pt-3 text-xs font-medium text-primary/80 transition-colors duration-200 group-hover:text-primary">
          +{category.services.length - 4} hizmet daha
        </span>
      )}
    </Link>
  );
}
