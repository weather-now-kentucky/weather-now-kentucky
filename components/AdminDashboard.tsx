"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { Edit3, LogIn, LogOut, Plus, Save, Trash2 } from "lucide-react";
import { getFirebaseServices, isFirebaseConfigured } from "@/lib/firebase";
import {
  deleteTeamMember,
  getBlogPosts,
  getSiteSettings,
  getSponsors,
  getTeamMembers,
  saveBlogPost,
  saveSiteSettings,
  saveSponsor,
  saveTeamMember,
  updateTeamMember,
  updateBlogPost,
  type BlogPost,
  type SiteSettings,
  type Sponsor,
  type TeamMember
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

const emptyTeamMember = {
  name: "",
  role: "",
  bio: "",
  imageUrl: "",
  linkUrl: "",
  order: 0
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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState("");
  const [teamMemberForm, setTeamMemberForm] = useState(emptyTeamMember);

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
      const [loadedSettings, loadedPosts, loadedSponsors, loadedTeamMembers] = await Promise.all([
        getSiteSettings(),
        getBlogPosts(false),
        getSponsors(false),
        getTeamMembers(false)
      ]);

      setSettings(loadedSettings);
      setPosts(loadedPosts);
      setSponsors(loadedSponsors);
      setTeamMembers(loadedTeamMembers);
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

  async function handleTeamMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      if (selectedTeamMemberId) {
        await updateTeamMember(selectedTeamMemberId, teamMemberForm);
        setMessage("Team member updated.");
      } else {
        await saveTeamMember(teamMemberForm);
        setMessage("Team member added.");
      }

      setTeamMemberForm(emptyTeamMember);
      setSelectedTeamMemberId("");
      setTeamMembers(await getTeamMembers(false));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save team member.");
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

  function editTeamMember(member: TeamMember) {
    setSelectedTeamMemberId(member.id);
    setTeamMemberForm({
      name: member.name,
      role: member.role,
      bio: member.bio,
      imageUrl: member.imageUrl,
      linkUrl: member.linkUrl,
      order: member.order
    });
  }

  async function removeTeamMember(member: TeamMember) {
    const shouldRemove = window.confirm(`Remove ${member.name} from the team page?`);

    if (!shouldRemove) {
      return;
    }

    try {
      await deleteTeamMember(member.id);
      setMessage("Team member removed.");

      if (selectedTeamMemberId === member.id) {
        setSelectedTeamMemberId("");
        setTeamMemberForm(emptyTeamMember);
      }

      setTeamMembers(await getTeamMembers(false));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove team member.");
    }
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

      <div className="grid two">
        <form className="panel admin-form" onSubmit={handleTeamMember}>
          <h2>{selectedTeamMemberId ? "Edit team member" : "Add team member"}</h2>
          <div className="field">
            <label htmlFor="teamName">Name</label>
            <input
              className="input"
              id="teamName"
              onChange={(event) => setTeamMemberForm({ ...teamMemberForm, name: event.target.value })}
              required
              value={teamMemberForm.name}
            />
          </div>
          <div className="field">
            <label htmlFor="teamRole">Role / Position</label>
            <input
              className="input"
              id="teamRole"
              onChange={(event) => setTeamMemberForm({ ...teamMemberForm, role: event.target.value })}
              required
              value={teamMemberForm.role}
            />
          </div>
          <div className="field">
            <label htmlFor="teamBio">Bio</label>
            <textarea
              className="textarea"
              id="teamBio"
              onChange={(event) => setTeamMemberForm({ ...teamMemberForm, bio: event.target.value })}
              required
              value={teamMemberForm.bio}
            />
          </div>
          <div className="field">
            <label htmlFor="teamImage">Headshot photo URL</label>
            <input
              className="input"
              id="teamImage"
              onChange={(event) => setTeamMemberForm({ ...teamMemberForm, imageUrl: event.target.value })}
              type="url"
              value={teamMemberForm.imageUrl}
            />
          </div>
          <div className="field">
            <label htmlFor="teamLink">Optional social/link URL</label>
            <input
              className="input"
              id="teamLink"
              onChange={(event) => setTeamMemberForm({ ...teamMemberForm, linkUrl: event.target.value })}
              type="url"
              value={teamMemberForm.linkUrl}
            />
          </div>
          <div className="field">
            <label htmlFor="teamOrder">Sort/order number</label>
            <input
              className="input"
              id="teamOrder"
              onChange={(event) => setTeamMemberForm({ ...teamMemberForm, order: Number(event.target.value) })}
              type="number"
              value={teamMemberForm.order}
            />
          </div>
          <div className="admin-actions">
            <button className="button" type="submit">
              {selectedTeamMemberId ? <Save aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
              {selectedTeamMemberId ? "Update member" : "Add member"}
            </button>
            {selectedTeamMemberId ? (
              <button
                className="button ghost"
                onClick={() => {
                  setSelectedTeamMemberId("");
                  setTeamMemberForm(emptyTeamMember);
                }}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="panel admin-list">
          <h2>Team members</h2>
          {teamMembers.map((member) => (
            <div className="list-row admin-list-row" key={member.id}>
              <button className="list-row-main" onClick={() => editTeamMember(member)} type="button">
                <Edit3 aria-hidden="true" size={16} />
                {member.order}. {member.name}
              </button>
              <button className="icon-danger" onClick={() => removeTeamMember(member)} type="button" aria-label={`Remove ${member.name}`}>
                <Trash2 aria-hidden="true" size={16} />
              </button>
            </div>
          ))}
          {teamMembers.length === 0 ? <p className="status-line">No Firestore team members yet. The public page shows placeholders.</p> : null}
        </div>
      </div>
    </section>
  );
}
