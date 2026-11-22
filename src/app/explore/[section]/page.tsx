import { notFound } from "next/navigation";
import FortuneShop from "@/components/fortune-shop";

const screens = new Set([
  "popular", "paired", "classic", "money", "loveHub", "relations", "special",
  "scenario", "all", "freeHub", "bundles", "reviews",
  "detail", "input", "free", "paywall", "full", "my", "gift", "today", "bundle",
]);

export default async function ExplorePage({ params }: PageProps<"/explore/[section]">) {
  const { section } = await params;
  if (!screens.has(section)) notFound();
  return <FortuneShop initialView={section} />;
}
