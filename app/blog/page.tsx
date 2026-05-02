import { BlogCard } from "@/components/BlogCard";
import { SectionSponsorTag } from "@/components/SectionSponsorTag";
import { getBlogPosts } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <>
      <section className="page-header">
        <span className="eyebrow">Weather Blog</span>
        <h1>Forecast notes and local updates.</h1>
        <p className="lede">Latest posts from the Weather Now Kentucky newsroom, pulled from Firestore.</p>
        <SectionSponsorTag sectionKey="blog_sidebar" />
      </section>
      <section className="grid two">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </section>
    </>
  );
}
