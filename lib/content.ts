import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
  businessCategory: string;
  websiteUrl: string;
  logoUrl: string;
  logoStoragePath: string;
  status: "active" | "inactive";
  priority: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAtLabel?: string;
  updatedAtLabel?: string;
  description: string;
  url: string;
};

export type SponsorPlacement = {
  id: string;
  sectionKey: string;
  sectionLabel: string;
  page: "home" | "outlook" | "radar" | "alerts" | "live" | "blog";
  sponsorId: string;
  enabled: boolean;
  displayLabel: string;
  placementType: "section-header" | "card-footer" | "alert-bar" | "radar-control" | "live-banner";
  rotationGroup?: string;
  priority: number;
  createdAtLabel?: string;
  updatedAtLabel?: string;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
  photoStoragePath: string;
  socialUrl: string;
  order: number;
  status: "active" | "inactive";
  createdAtLabel?: string;
  updatedAtLabel?: string;
};

const fallbackSettings: SiteSettings = {
  forecastOverride: "",
  isLive: false,
  youtubeVideoId: process.env.NEXT_PUBLIC_YOUTUBE_LIVE_VIDEO_ID ?? ""
};

function contentDebug(message: string, payload?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.info(message, payload);
  }
}

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
    businessCategory: "Community Partner",
    websiteUrl: "https://weather.gov",
    logoStoragePath: "",
    status: "active",
    priority: 0,
    description: "Sponsor tiles will populate from Firestore after setup.",
    url: "https://weather.gov",
    logoUrl: ""
  }
];

export const fallbackTeamMembers: TeamMember[] = [];

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
  const websiteUrl = String(data.websiteUrl ?? data.url ?? "#");
  const businessCategory = String(data.businessCategory ?? data.description ?? "");

  return {
    id,
    name: String(data.name ?? "Sponsor"),
    businessCategory,
    websiteUrl,
    logoUrl: String(data.logoUrl ?? ""),
    logoStoragePath: String(data.logoStoragePath ?? ""),
    status: data.status === "inactive" ? "inactive" : "active",
    priority: typeof data.priority === "number" ? data.priority : 0,
    startDate: String(data.startDate ?? ""),
    endDate: String(data.endDate ?? ""),
    notes: String(data.notes ?? ""),
    createdAtLabel: formatDate(data.createdAt),
    updatedAtLabel: formatDate(data.updatedAt),
    description: businessCategory,
    url: websiteUrl
  };
}

function mapSponsorPlacement(id: string, data: DocumentData): SponsorPlacement {
  return {
    id,
    sectionKey: String(data.sectionKey ?? ""),
    sectionLabel: String(data.sectionLabel ?? data.sectionKey ?? ""),
    page: String(data.page ?? "home") as SponsorPlacement["page"],
    sponsorId: String(data.sponsorId ?? ""),
    enabled: Boolean(data.enabled),
    displayLabel: String(data.displayLabel ?? "Sponsored by"),
    placementType: String(data.placementType ?? "section-header") as SponsorPlacement["placementType"],
    rotationGroup: String(data.rotationGroup ?? ""),
    priority: typeof data.priority === "number" ? data.priority : 0,
    createdAtLabel: formatDate(data.createdAt),
    updatedAtLabel: formatDate(data.updatedAt)
  };
}

function mapTeamMember(id: string, data: DocumentData): TeamMember {
  return {
    id,
    name: String(data.name ?? "Team Member"),
    role: String(data.role ?? ""),
    bio: String(data.bio ?? ""),
    photoUrl: String(data.photoUrl ?? data.imageUrl ?? ""),
    photoStoragePath: String(data.photoStoragePath ?? ""),
    socialUrl: String(data.socialUrl ?? data.linkUrl ?? ""),
    order: typeof data.order === "number" ? data.order : 999,
    status: data.status === "inactive" ? "inactive" : "active",
    createdAtLabel: formatDate(data.createdAt),
    updatedAtLabel: formatDate(data.updatedAt)
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

  try {
    const db = getFirebaseDb();
    const snapshot = await getDocs(query(collection(db, "sponsors"), orderBy("priority", "desc")));
    const sponsors = snapshot.docs.map((sponsor) => mapSponsor(sponsor.id, sponsor.data()));

    return sponsors.length ? sponsors : includeFallback ? fallbackSponsors : [];
  } catch (error) {
    console.error("Unable to load sponsors from Firestore.", error);
    return includeFallback ? fallbackSponsors : [];
  }
}

export async function getActiveSponsors(): Promise<Sponsor[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  try {
    const db = getFirebaseDb();
    const snapshot = await getDocs(query(collection(db, "sponsors"), where("status", "==", "active")));
    return snapshot.docs.map((sponsor) => mapSponsor(sponsor.id, sponsor.data())).sort((a, b) => b.priority - a.priority);
  } catch (error) {
    console.error("Unable to load active sponsors from Firestore.", error);
    return [];
  }
}

export async function getSponsorPlacements(includeFallback = false): Promise<SponsorPlacement[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  try {
    const db = getFirebaseDb();
    const snapshot = await getDocs(query(collection(db, "sponsorPlacements"), orderBy("sectionKey", "asc")));
    const placements = snapshot.docs.map((placement) => mapSponsorPlacement(placement.id, placement.data()));

    return placements.length ? placements : includeFallback ? [] : [];
  } catch (error) {
    console.error("Unable to load sponsor placements from Firestore.", error);
    return [];
  }
}

export async function getSponsorPlacementsForSection(sectionKey: string): Promise<SponsorPlacement[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  try {
    const db = getFirebaseDb();
    const snapshot = await getDocs(query(collection(db, "sponsorPlacements"), where("sectionKey", "==", sectionKey), where("enabled", "==", true)));
    return snapshot.docs.map((placement) => mapSponsorPlacement(placement.id, placement.data()));
  } catch (error) {
    console.error(`Unable to load sponsor placements for ${sectionKey}.`, error);
    return [];
  }
}

export async function getTeamMembers(includeFallback = true, publicOnly = includeFallback): Promise<TeamMember[]> {
  if (!isFirebaseConfigured()) {
    return includeFallback ? fallbackTeamMembers : [];
  }

  try {
    const db = getFirebaseDb();
    const teamQuery = publicOnly
      ? query(collection(db, "teamMembers"), where("status", "==", "active"))
      : query(collection(db, "teamMembers"), orderBy("order", "asc"));
    const snapshot = await getDocs(teamQuery);
    const members = snapshot.docs
      .map((member) => mapTeamMember(member.id, member.data()))
      .filter((member) => !publicOnly || member.status === "active")
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

    return members.length ? members : includeFallback ? fallbackTeamMembers : [];
  } catch (error) {
    console.error("Unable to load team members from Firestore.", error);
    return includeFallback ? fallbackTeamMembers : [];
  }
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

export async function saveSponsor(sponsor: Omit<Sponsor, "id" | "description" | "url" | "createdAtLabel" | "updatedAtLabel">) {
  const db = getFirebaseDb();
  const created = await addDoc(collection(db, "sponsors"), {
    ...sponsor,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return created.id;
}

export async function updateSponsor(id: string, sponsor: Omit<Sponsor, "id" | "description" | "url" | "createdAtLabel" | "updatedAtLabel">) {
  const db = getFirebaseDb();
  await updateDoc(doc(db, "sponsors", id), {
    ...sponsor,
    updatedAt: serverTimestamp()
  });
}

export async function saveSponsorPlacement(placement: Omit<SponsorPlacement, "id" | "createdAtLabel" | "updatedAtLabel">) {
  const db = getFirebaseDb();
  contentDebug("Firestore saveSponsorPlacement payload", placement);
  const created = await addDoc(collection(db, "sponsorPlacements"), {
    ...placement,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  contentDebug("Firestore saveSponsorPlacement response", { id: created.id });
  return created.id;
}

export async function updateSponsorPlacement(id: string, placement: Omit<SponsorPlacement, "id" | "createdAtLabel" | "updatedAtLabel">) {
  const db = getFirebaseDb();
  contentDebug("Firestore updateSponsorPlacement payload", { id, placement });
  await updateDoc(doc(db, "sponsorPlacements", id), {
    ...placement,
    updatedAt: serverTimestamp()
  });
  contentDebug("Firestore updateSponsorPlacement response", { id });
}

export async function saveTeamMember(member: Omit<TeamMember, "id" | "createdAtLabel" | "updatedAtLabel">) {
  const db = getFirebaseDb();
  contentDebug("Firestore saveTeamMember payload", member);
  const created = await addDoc(collection(db, "teamMembers"), {
    ...member,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  contentDebug("Firestore saveTeamMember response", { id: created.id });
  return created.id;
}

export async function updateTeamMember(id: string, member: Omit<TeamMember, "id" | "createdAtLabel" | "updatedAtLabel">) {
  const db = getFirebaseDb();
  contentDebug("Firestore updateTeamMember payload", { id, member });
  await updateDoc(doc(db, "teamMembers", id), {
    ...member,
    updatedAt: serverTimestamp()
  });
  contentDebug("Firestore updateTeamMember response", { id });
}

export async function deleteTeamMember(id: string) {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "teamMembers", id));
}
