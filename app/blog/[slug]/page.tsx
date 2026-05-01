import { notFound } from "next/navigation";
import { getBlogPost } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getBlogPost(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="panel" style={{ display: "grid", gap: 16 }}>
      <span className="eyebrow">{post.publishedAtLabel}</span>
      <h1>{post.title}</h1>
      <p className="lede">{post.excerpt}</p>
      <div style={{ color: "var(--ink)", display: "grid", gap: 14, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
        {post.body}
      </div>
    </article>
  );
}
