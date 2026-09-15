import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/panel/",
          "/hesabim",
          "/taleplerim",
          "/uyelik/odeme",
        ],
      },
    ],
    sitemap: "https://neyeihtiyacvar.com/sitemap.xml",
    host: "https://neyeihtiyacvar.com",
  };
}