import { notFound } from "next/navigation";
import FortuneShop from "@/components/fortune-shop";

const screens = new Set([
  "popular", "paired", "classic", "money", "loveHub", "relations", "special",
  "scenario", "all", "freeHub", "bundles", "reviews",
  "detail", "input", "free", "paywall", "full", "my", "gift", "today", "bundle",
]);

export default async function ExplorePage({ params, searchParams }: PageProps<"/explore/[section]">) {
  const { section } = await params;
  const query = await searchParams;
  if (!screens.has(section)) notFound();
  const initialProductId = typeof query.item === "string" ? query.item : "life";
  return <FortuneShop initialView={section} initialProductId={initialProductId} />;
}
