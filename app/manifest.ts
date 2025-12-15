import type { MetadataRoute } from "next";
import { SEO_CONFIG } from "@/lib/seo-config";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SEO_CONFIG.manifest.name,
    short_name: SEO_CONFIG.manifest.shortName,
    description: SEO_CONFIG.manifest.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#3b82f6",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
