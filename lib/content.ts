import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData
} from "firebase/firestore/lite";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

export type SiteSettings = {
  forecastOverride: string;
  isLive: boolean;
  youtubeVideoId: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  publishedAtLabel: string;
};

export type Sponsor = {
  id: string;
  name: string;
  description: string;
  url: string;
  logoUrl: string;
};

const fallbackSettings: SiteSettings = {
  forecastOverride: "",
  isLive: false,
  youtubeVideoId: process.env.NEXT_PUBLIC_YOUTUBE_LIVE_VIDEO_ID ?? ""
};

const fallbackPosts: BlogPost[] = [
  {
    id: "sample-1",
    slug: "kentucky-weather-update",
    title: "Kentucky Weather Update",
    excerpt: "A sample post appears here until Firestore blog posts are published.",
    body: "Connect Firebase and publish from the admin panel to replace this sample post with live newsroom updates.",
    publishedAtLabel: "Draft sample"
  }
];

const fallbackSponsors: Sponsor[] = [
  {
    id: "sample-sponsor",
    name: "Community Sponsor",
    description: "Sponsor tiles will populate from Firestore after setup.",
    url: "https://weather.gov",
    logoUrl: ""
  }
];

function formatDate(value: unknown) {
  const timestamp = value as { toDate?: () => Date } | null;

  if (timestamp && typeof timestamp.toDate === "function") {
    return timestamp.toDate().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  return "Recently published";
}

function toSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapPost(id: string, data: DocumentData): BlogPost {
  const title = String(data.title ?? "Untitled Update");
  const body = String(data.body ?? "");

  return {
    id,
    slug: String(data.slug ?? toSlug(title)),
    title,
    excerpt: String(data.excerpt ?? body.slice(0, 150)),
    body,
    publishedAtLabel: formatDate(data.publishedAt)
  };
}

function mapSponsor(id: string, data: DocumentData): Sponsor {
  return {
    id,
    name: String(data.name ?? "Sponsor"),
    description: String(data.description ?? ""),
    url: String(data.url ?? "#"),
    logoUrl: String(data.logoUrl ?? "")
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isFirebaseConfigured()) {
    return fallbackSettings;
  }

  const db = getFirebaseDb();
  const snapshot = await getDoc(doc(db, "settings", "site"));
  const data = snapshot.data();

  return {
    forecastOverride: String(data?.forecastOverride ?? ""),
    isLive: Boolean(data?.isLive),
    youtubeVideoId: String(data?.youtubeVideoId ?? "")
  };
}

export async function getBlogPosts(includeFallback = true): Promise<BlogPost[]> {
  if (!isFirebaseConfigured()) {
    return includeFallback ? fallbackPosts : [];
  }

  const db = getFirebaseDb();
  const snapshot = await getDocs(query(collection(db, "posts"), orderBy("publishedAt", "desc"), limit(25)));
  const posts = snapshot.docs.map((post) => mapPost(post.id, post.data()));

  return posts.length ? posts : includeFallback ? fallbackPosts : [];
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getSponsors(includeFallback = true): Promise<Sponsor[]> {
  if (!isFirebaseConfigured()) {
    return includeFallback ? fallbackSponsors : [];
  }

  const db = getFirebaseDb();
  const snapshot = await getDocs(query(collection(db, "sponsors"), orderBy("name", "asc")));
  const sponsors = snapshot.docs.map((sponsor) => mapSponsor(sponsor.id, sponsor.data()));

  return sponsors.length ? sponsors : includeFallback ? fallbackSponsors : [];
}

export async function saveSiteSettings(settings: SiteSettings) {
  const db = getFirebaseDb();
  await setDoc(doc(db, "settings", "site"), settings, { merge: true });
}

export async function saveBlogPost(post: Omit<BlogPost, "id" | "publishedAtLabel">) {
  const db = getFirebaseDb();
  await addDoc(collection(db, "posts"), {
    ...post,
    slug: post.slug || toSlug(post.title),
    publishedAt: serverTimestamp()
  });
}

export async function updateBlogPost(id: string, post: Omit<BlogPost, "id" | "publishedAtLabel">) {
  const db = getFirebaseDb();
  await updateDoc(doc(db, "posts", id), {
    ...post,
    slug: post.slug || toSlug(post.title)
  });
}

export async function saveSponsor(sponsor: Omit<Sponsor, "id">) {
  const db = getFirebaseDb();
  await addDoc(collection(db, "sponsors"), sponsor);
}
