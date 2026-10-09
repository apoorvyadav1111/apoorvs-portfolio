import { ogImage, ogSize } from "@/lib/og";
import { getAllPosts, getPost, formatDate } from "@/lib/posts";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "Blog post preview";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  return ogImage({
    eyebrow: post ? `Writing · ${formatDate(post.date)}` : "Writing",
    title: post?.title ?? "Writing",
  });
}
