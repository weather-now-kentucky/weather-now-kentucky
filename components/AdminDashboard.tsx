"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { Edit3, LogIn, LogOut, Plus, Save } from "lucide-react";
import { getFirebaseServices, isFirebaseConfigured } from "@/lib/firebase";
import {
  getBlogPosts,
  getSiteSettings,
  getSponsors,
  saveBlogPost,
  saveSiteSettings,
  saveSponsor,
  updateBlogPost,
  type BlogPost,
  type SiteSettings,
  type Sponsor
} from "@/lib/content";

const emptyPost = {
  slug: "",
  title: "",
  excerpt: "",
  body: ""
};

const emptySponsor = {
  name: "",
  description: "",
  url: "",
  logoUrl: ""
};

export function AdminDashboard() {
  const configured = useMemo(() => isFirebaseConfigured(), []);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<SiteSettings>({ forecastOverride: "", isLive: false, youtubeVideoId: "" });
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [postForm, setPostForm] = useState(emptyPost);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [sponsorForm, setSponsorForm] = useState(emptySponsor);

  useEffect(() => {
    if (!configured) {
      return;
    }

    const { auth } = getFirebaseServices();
    return onAuthStateChanged(auth, setUser);
  }, [configured]);

  useEffect(() => {
    if (!user) {
      return;
    }

    async function loadAdminData() {
      const [loadedSettings, loadedPosts, loadedSponsors] = await Promise.all([
        getSiteSettings(),
        getBlogPosts(false),
        getSponsors(false)
      ]);

      setSettings(loadedSettings);
      setPosts(loadedPosts);
      setSponsors(loadedSponsors);
    }

    loadAdminData().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load admin data."));
  }, [user]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const { auth } = getFirebaseServices();
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    }
  }

  async function handleSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      await saveSiteSettings(settings);
      setMessage("Settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save settings.");
    }
  }

  async function handlePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      if (selectedPostId) {
        await updateBlogPost(selectedPostId, postForm);
        setMessage("Blog post updated.");
      } else {
        await saveBlogPost(postForm);
        setMessage("Blog post added.");
      }

      setPostForm(emptyPost);
      setSelectedPostId("");
      setPosts(await getBlogPosts(false));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save blog post.");
    }
  }

  async function handleSponsor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      await saveSponsor(sponsorForm);
      setMessage("Sponsor added.");
      setSponsorForm(emptySponsor);
      setSponsors(await getSponsors(false));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save sponsor.");
    }
  }

  function editPost(post: BlogPost) {
    setSelectedPostId(post.id);
    setPostForm({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      body: post.body
    });
  }

  if (!configured) {
    return (
      <section className="panel">
        <h2>Firebase setup required</h2>
        <p className="lede" style={{ marginTop: 8 }}>
          Add the values from `.env.example` to `.env.local`, enable Firebase Auth email/password, and create Firestore
          collections named `settings`, `posts`, and `sponsors`.
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <form className="panel admin-form" onSubmit={handleLogin}>
        <h2>Sign in</h2>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            className="input"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </div>
        <button className="button" type="submit">
          <LogIn aria-hidden="true" size={16} />
          Log in
        </button>
        {message ? <p className="status-line">{message}</p> : null}
      </form>
    );
  }

  return (
    <section className="grid" style={{ gap: 22 }}>
      <div className="panel admin-toolbar">
        <strong>{user.email}</strong>
        <button className="button ghost" onClick={() => signOut(getFirebaseServices().auth)} type="button">
          <LogOut aria-hidden="true" size={16} />
          Log out
        </button>
      </div>

      {message ? <p className="panel status-line">{message}</p> : null}

      <form className="panel admin-form" onSubmit={handleSettings}>
        <h2>Live and forecast settings</h2>
        <div className="field">
          <label htmlFor="forecastOverride">Forecast override</label>
          <textarea
            className="textarea"
            id="forecastOverride"
            onChange={(event) => setSettings({ ...settings, forecastOverride: event.target.value })}
            value={settings.forecastOverride}
          />
        </div>
        <label className="toggle-row">
          <input
            checked={settings.isLive}
            onChange={(event) => setSettings({ ...settings, isLive: event.target.checked })}
            type="checkbox"
          />
          Show LIVE NOW
        </label>
        <div className="field">
          <label htmlFor="youtubeVideoId">YouTube Live Video ID</label>
          <input
            className="input"
            id="youtubeVideoId"
            onChange={(event) => setSettings({ ...settings, youtubeVideoId: event.target.value })}
            placeholder="V6WgplepOp4"
            value={settings.youtubeVideoId}
          />
          <p className="field-help">Paste only the video ID, not the full YouTube URL.</p>
        </div>
        <button className="button" type="submit">
          <Save aria-hidden="true" size={16} />
          Save settings
        </button>
      </form>

      <div className="grid two">
        <form className="panel admin-form" onSubmit={handlePost}>
          <h2>{selectedPostId ? "Edit blog post" : "Add blog post"}</h2>
          <div className="field">
            <label htmlFor="postTitle">Title</label>
            <input
              className="input"
              id="postTitle"
              onChange={(event) => setPostForm({ ...postForm, title: event.target.value })}
              required
              value={postForm.title}
            />
          </div>
          <div className="field">
            <label htmlFor="postSlug">Slug</label>
            <input
              className="input"
              id="postSlug"
              onChange={(event) => setPostForm({ ...postForm, slug: event.target.value })}
              value={postForm.slug}
            />
          </div>
          <div className="field">
            <label htmlFor="postExcerpt">Excerpt</label>
            <textarea
              className="textarea"
              id="postExcerpt"
              onChange={(event) => setPostForm({ ...postForm, excerpt: event.target.value })}
              required
              value={postForm.excerpt}
            />
          </div>
          <div className="field">
            <label htmlFor="postBody">Body</label>
            <textarea
              className="textarea"
              id="postBody"
              onChange={(event) => setPostForm({ ...postForm, body: event.target.value })}
              required
              value={postForm.body}
            />
          </div>
          <button className="button" type="submit">
            {selectedPostId ? <Save aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
            {selectedPostId ? "Update post" : "Add post"}
          </button>
        </form>

        <div className="panel admin-list">
          <h2>Existing posts</h2>
          {posts.map((post) => (
            <button className="list-button" key={post.id} onClick={() => editPost(post)} type="button">
              <Edit3 aria-hidden="true" size={16} />
              {post.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid two">
        <form className="panel admin-form" onSubmit={handleSponsor}>
          <h2>Add sponsor</h2>
          <div className="field">
            <label htmlFor="sponsorName">Name</label>
            <input
              className="input"
              id="sponsorName"
              onChange={(event) => setSponsorForm({ ...sponsorForm, name: event.target.value })}
              required
              value={sponsorForm.name}
            />
          </div>
          <div className="field">
            <label htmlFor="sponsorDescription">Description</label>
            <input
              className="input"
              id="sponsorDescription"
              onChange={(event) => setSponsorForm({ ...sponsorForm, description: event.target.value })}
              value={sponsorForm.description}
            />
          </div>
          <div className="field">
            <label htmlFor="sponsorUrl">External URL</label>
            <input
              className="input"
              id="sponsorUrl"
              onChange={(event) => setSponsorForm({ ...sponsorForm, url: event.target.value })}
              required
              type="url"
              value={sponsorForm.url}
            />
          </div>
          <div className="field">
            <label htmlFor="sponsorLogo">Logo URL</label>
            <input
              className="input"
              id="sponsorLogo"
              onChange={(event) => setSponsorForm({ ...sponsorForm, logoUrl: event.target.value })}
              type="url"
              value={sponsorForm.logoUrl}
            />
          </div>
          <button className="button" type="submit">
            <Plus aria-hidden="true" size={16} />
            Add sponsor
          </button>
        </form>

        <div className="panel admin-list">
          <h2>Current sponsors</h2>
          {sponsors.map((sponsor) => (
            <span className="list-row" key={sponsor.id}>
              {sponsor.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
