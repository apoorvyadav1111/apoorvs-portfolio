import type { MetadataRoute } from "next";
import personal from "@/data/personal.json";
import { getAllPosts } from "@/lib/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/blog", "/reading", "/photos"].map((path) => ({
    url: `${personal.url}${path}`,
  }));
  const posts = getAllPosts().map((post) => ({
    url: `${personal.url}/blog/${post.slug}`,
    lastModified: post.date,
  }));
  return [...pages, ...posts];
}
