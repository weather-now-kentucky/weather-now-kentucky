import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { BlogPost } from "@/lib/content";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <article className="blog-card card">
      <span className="blog-date">
        <CalendarDays aria-hidden="true" size={16} />
        {post.publishedAtLabel}
      </span>
      <h3>
        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
      </h3>
      <p>{post.excerpt}</p>
      <Link className="read-link" href={`/blog/${post.slug}`}>
        Read update
      </Link>
    </article>
  );
}
