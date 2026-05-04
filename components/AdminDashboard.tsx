"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Edit3, LogIn, LogOut, Plus, Save, Trash2 } from "lucide-react";
import { getFirebaseServices, getFirebaseStorage, isFirebaseConfigured } from "@/lib/firebase";
import {
  deleteTeamMember,
  getBlogPosts,
  getSiteSettings,
  getSponsorPlacements,
  getSponsors,
  getTeamMembers,
  saveBlogPost,
  saveSiteSettings,
  saveSponsor,
  saveSponsorPlacement,
  saveTeamMember,
  updateSponsor,
  updateSponsorPlacement,
  updateTeamMember,
  updateBlogPost,
  type BlogPost,
  type SiteSettings,
  type Sponsor,
  type SponsorPlacement,
  type TeamMember
} from "@/lib/content";

const emptyPost = {
  slug: "",
  title: "",
  excerpt: "",
  body: ""
};

type SponsorFormState = Omit<Sponsor, "id" | "description" | "url" | "createdAtLabel" | "updatedAtLabel">;

const emptySponsor: SponsorFormState = {
  name: "",
  businessCategory: "",
  websiteUrl: "",
  logoUrl: "",
  logoStoragePath: "",
  status: "active" as const,
  priority: 0,
  startDate: "",
  endDate: "",
  notes: ""
};

const sectionOptions = [
  { sectionKey: "home_current_conditions", sectionLabel: "Home - Current Conditions", page: "home" },
  { sectionKey: "home_incoming_weather_bar", sectionLabel: "Home - Incoming Weather Bar", page: "home" },
  { sectionKey: "home_outdoor_conditions", sectionLabel: "Home - Outdoor Conditions", page: "home" },
  { sectionKey: "home_hourly_conditions", sectionLabel: "Home - Hour-by-Hour Conditions", page: "home" },
  { sectionKey: "outlook_seven_day", sectionLabel: "Outlook - Seven-Day Forecast", page: "outlook" },
  { sectionKey: "outlook_regional_breakdown", sectionLabel: "Outlook - Regional Breakdown", page: "outlook" },
  { sectionKey: "radar_main", sectionLabel: "Radar - Main", page: "radar" },
  { sectionKey: "alerts_main", sectionLabel: "Alerts - Main", page: "alerts" },
  { sectionKey: "live_stream", sectionLabel: "Live - Stream", page: "live" },
  { sectionKey: "blog_sidebar", sectionLabel: "Blog - Sidebar/Footer", page: "blog" }
] as const;

const emptyPlacement = {
  sectionKey: "home_current_conditions",
  sectionLabel: "Home - Current Conditions",
  page: "home" as SponsorPlacement["page"],
  sponsorId: "",
  enabled: true,
  displayLabel: "Sponsored by",
  placementType: "section-header" as SponsorPlacement["placementType"],
  rotationGroup: "",
  priority: 0
};

type TeamMemberFormState = Omit<TeamMember, "id" | "createdAtLabel" | "updatedAtLabel">;

const emptyTeamMember: TeamMemberFormState = {
  name: "",
  role: "",
  bio: "",
  photoUrl: "",
  photoStoragePath: "",
  socialUrl: "",
  order: 0,
  status: "active" as const
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
  const [selectedSponsorId, setSelectedSponsorId] = useState("");
  const [sponsorLogoFile, setSponsorLogoFile] = useState<File | null>(null);
  const [showSponsorLogoUrl, setShowSponsorLogoUrl] = useState(false);
  const [sponsorPlacements, setSponsorPlacements] = useState<SponsorPlacement[]>([]);
  const [placementForm, setPlacementForm] = useState(emptyPlacement);
  const [selectedPlacementId, setSelectedPlacementId] = useState("");
  const [isSavingPlacement, setIsSavingPlacement] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState("");
  const [teamMemberForm, setTeamMemberForm] = useState(emptyTeamMember);
  const [teamHeadshotFile, setTeamHeadshotFile] = useState<File | null>(null);
  const [teamHeadshotPreview, setTeamHeadshotPreview] = useState("");
  const [isSavingTeamMember, setIsSavingTeamMember] = useState(false);

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
      const [loadedSettings, loadedPosts, loadedSponsors, loadedPlacements, loadedTeamMembers] = await Promise.all([
        getSiteSettings(),
        getBlogPosts(false),
        getSponsors(false),
        getSponsorPlacements(false),
        getTeamMembers(false, false)
      ]);

      setSettings(loadedSettings);
      setPosts(loadedPosts);
      setSponsors(loadedSponsors);
      setSponsorPlacements(loadedPlacements);
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
      if (sponsorLogoFile && sponsorLogoFile.size > 2_000_000) {
        throw new Error("Logo file must be 2 MB or smaller.");
      }

      let logoUrl = sponsorForm.logoUrl;
      let logoStoragePath = sponsorForm.logoStoragePath;
      let sponsorId = selectedSponsorId;

      if (!sponsorId) {
        sponsorId = await saveSponsor(sponsorForm);
      }

      if (sponsorLogoFile) {
        const extension = sponsorLogoFile.name.split(".").pop()?.toLowerCase() || "png";
        logoStoragePath = `sponsors/${sponsorId}/logo.${extension}`;
        const logoRef = ref(getFirebaseStorage(), logoStoragePath);
        await uploadBytes(logoRef, sponsorLogoFile, { contentType: sponsorLogoFile.type });
        logoUrl = await getDownloadURL(logoRef);
      }

      await updateSponsor(sponsorId, {
        ...sponsorForm,
        logoUrl,
        logoStoragePath
      });

      setMessage(selectedSponsorId ? "Sponsor updated." : "Sponsor added.");
      setSponsorForm(emptySponsor);
      setSelectedSponsorId("");
      setSponsorLogoFile(null);
      setShowSponsorLogoUrl(false);
      setSponsors(await getSponsors(false));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save sponsor.");
    }
  }

  async function handlePlacement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSavingPlacement(true);

    try {
      if (!placementForm.sponsorId) {
        throw new Error("Choose a sponsor for this placement.");
      }

      if (selectedPlacementId) {
        await updateSponsorPlacement(selectedPlacementId, placementForm);
        setMessage("Sponsor placement updated.");
      } else {
        await saveSponsorPlacement(placementForm);
        setMessage("Sponsor placement added.");
      }

      setPlacementForm(emptyPlacement);
      setSelectedPlacementId("");
      setSponsorPlacements(await getSponsorPlacements(false));
    } catch (error) {
      console.error("Unable to save sponsor placement.", error);
      setMessage(error instanceof Error ? error.message : "Unable to save sponsor placement.");
    } finally {
      setIsSavingPlacement(false);
    }
  }

  async function handleTeamMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSavingTeamMember(true);

    try {
      if (teamHeadshotFile && teamHeadshotFile.size > 2_000_000) {
        throw new Error("Headshot file must be 2 MB or smaller.");
      }

      let photoUrl = teamMemberForm.photoUrl;
      let photoStoragePath = teamMemberForm.photoStoragePath;
      let teamMemberId = selectedTeamMemberId;

      if (!teamMemberId) {
        teamMemberId = await saveTeamMember(teamMemberForm);
      }

      if (teamHeadshotFile) {
        const extension = teamHeadshotFile.name.split(".").pop()?.toLowerCase() || "jpg";
        photoStoragePath = `teamMembers/${teamMemberId}/headshot.${extension}`;
        const headshotRef = ref(getFirebaseStorage(), photoStoragePath);
        await uploadBytes(headshotRef, teamHeadshotFile, { contentType: teamHeadshotFile.type });
        photoUrl = await getDownloadURL(headshotRef);
      }

      await updateTeamMember(teamMemberId, {
        ...teamMemberForm,
        photoUrl,
        photoStoragePath
      });

      setMessage(selectedTeamMemberId ? "Team member updated." : "Team member added.");
      setTeamMemberForm(emptyTeamMember);
      setSelectedTeamMemberId("");
      setTeamHeadshotFile(null);
      setTeamHeadshotPreview("");
      setTeamMembers(await getTeamMembers(false, false));
    } catch (error) {
      console.error("Unable to save team member.", error);
      setMessage(error instanceof Error ? error.message : "Unable to save team member.");
    } finally {
      setIsSavingTeamMember(false);
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
      photoUrl: member.photoUrl,
      photoStoragePath: member.photoStoragePath,
      socialUrl: member.socialUrl,
      order: member.order,
      status: member.status
    });
    setTeamHeadshotFile(null);
    setTeamHeadshotPreview("");
  }

  function editSponsor(sponsor: Sponsor) {
    setSelectedSponsorId(sponsor.id);
    setSponsorForm({
      name: sponsor.name,
      businessCategory: sponsor.businessCategory,
      websiteUrl: sponsor.websiteUrl,
      logoUrl: sponsor.logoUrl,
      logoStoragePath: sponsor.logoStoragePath,
      status: sponsor.status,
      priority: sponsor.priority,
      startDate: sponsor.startDate ?? "",
      endDate: sponsor.endDate ?? "",
      notes: sponsor.notes ?? ""
    });
    setSponsorLogoFile(null);
    setShowSponsorLogoUrl(false);
  }

  function startSponsorPlacement(sponsor: Sponsor) {
    setSelectedPlacementId("");
    setPlacementForm((current) => ({
      ...current,
      sponsorId: sponsor.id,
      enabled: true
    }));
    setMessage(`Ready to place ${sponsor.name}. Choose a section and select Add placement.`);
  }

  async function deactivateSponsor(sponsor: Sponsor) {
    try {
      await updateSponsor(sponsor.id, {
        name: sponsor.name,
        businessCategory: sponsor.businessCategory,
        websiteUrl: sponsor.websiteUrl,
        logoUrl: sponsor.logoUrl,
        logoStoragePath: sponsor.logoStoragePath,
        status: "inactive",
        priority: sponsor.priority,
        startDate: sponsor.startDate ?? "",
        endDate: sponsor.endDate ?? "",
        notes: sponsor.notes ?? ""
      });
      setMessage("Sponsor deactivated.");
      setSponsors(await getSponsors(false));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to deactivate sponsor.");
    }
  }

  function editPlacement(placement: SponsorPlacement) {
    setSelectedPlacementId(placement.id);
    setPlacementForm({
      sectionKey: placement.sectionKey,
      sectionLabel: placement.sectionLabel,
      page: placement.page,
      sponsorId: placement.sponsorId,
      enabled: placement.enabled,
      displayLabel: placement.displayLabel,
      placementType: placement.placementType,
      rotationGroup: placement.rotationGroup ?? "",
      priority: placement.priority
    });
  }

  function applySectionOption(sectionKey: string) {
    const option = sectionOptions.find((item) => item.sectionKey === sectionKey) ?? sectionOptions[0];
    setPlacementForm({
      ...placementForm,
      sectionKey: option.sectionKey,
      sectionLabel: option.sectionLabel,
      page: option.page
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

      setTeamMembers(await getTeamMembers(false, false));
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
          <h2>{selectedSponsorId ? "Edit sponsor" : "Add sponsor"}</h2>
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
            <label htmlFor="sponsorCategory">Business category</label>
            <input
              className="input"
              id="sponsorCategory"
              onChange={(event) => setSponsorForm({ ...sponsorForm, businessCategory: event.target.value })}
              value={sponsorForm.businessCategory}
            />
          </div>
          <div className="field">
            <label htmlFor="sponsorUrl">Website URL</label>
            <input
              className="input"
              id="sponsorUrl"
              onChange={(event) => setSponsorForm({ ...sponsorForm, websiteUrl: event.target.value })}
              required
              type="url"
              value={sponsorForm.websiteUrl}
            />
          </div>
          <div className="field">
            <label htmlFor="sponsorLogo">Logo upload</label>
            <input
              className="input"
              id="sponsorLogo"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(event) => setSponsorLogoFile(event.target.files?.[0] ?? null)}
              type="file"
            />
            <p className="field-help">PNG, JPG, WEBP, or SVG. Transparent PNG or SVG recommended. Max 2 MB.</p>
          </div>
          {sponsorForm.logoUrl ? (
            <div className="sponsor-logo-preview">
              <img alt={`${sponsorForm.name || "Sponsor"} logo preview`} src={sponsorForm.logoUrl} />
            </div>
          ) : null}
          <button className="location-current-button" onClick={() => setShowSponsorLogoUrl((value) => !value)} type="button">
            Advanced / use external logo URL
          </button>
          {showSponsorLogoUrl ? (
            <div className="field">
              <label htmlFor="sponsorLogoUrl">Logo URL</label>
              <input
                className="input"
                id="sponsorLogoUrl"
                onChange={(event) => setSponsorForm({ ...sponsorForm, logoUrl: event.target.value })}
                type="url"
                value={sponsorForm.logoUrl}
              />
            </div>
          ) : null}
          <label className="toggle-row">
            <input
              checked={sponsorForm.status === "active"}
              onChange={(event) => setSponsorForm({ ...sponsorForm, status: event.target.checked ? "active" : "inactive" })}
              type="checkbox"
            />
            Active sponsor
          </label>
          <div className="field">
            <label htmlFor="sponsorPriority">Priority</label>
            <input
              className="input"
              id="sponsorPriority"
              onChange={(event) => setSponsorForm({ ...sponsorForm, priority: Number(event.target.value) })}
              type="number"
              value={sponsorForm.priority}
            />
          </div>
          <div className="grid two">
            <div className="field">
              <label htmlFor="sponsorStart">Start date</label>
              <input
                className="input"
                id="sponsorStart"
                onChange={(event) => setSponsorForm({ ...sponsorForm, startDate: event.target.value })}
                type="date"
                value={sponsorForm.startDate}
              />
            </div>
            <div className="field">
              <label htmlFor="sponsorEnd">End date</label>
              <input
                className="input"
                id="sponsorEnd"
                onChange={(event) => setSponsorForm({ ...sponsorForm, endDate: event.target.value })}
                type="date"
                value={sponsorForm.endDate}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="sponsorNotes">Notes</label>
            <textarea
              className="textarea"
              id="sponsorNotes"
              onChange={(event) => setSponsorForm({ ...sponsorForm, notes: event.target.value })}
              value={sponsorForm.notes}
            />
          </div>
          <div className="admin-actions">
            <button className="button" type="submit">
              {selectedSponsorId ? <Save aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
              {selectedSponsorId ? "Update sponsor" : "Add sponsor"}
            </button>
            {selectedSponsorId ? (
              <button
                className="button ghost"
                onClick={() => {
                  setSelectedSponsorId("");
                  setSponsorForm(emptySponsor);
                  setSponsorLogoFile(null);
                  setShowSponsorLogoUrl(false);
                }}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="panel admin-list">
          <h2>Sponsor list</h2>
          {sponsors.map((sponsor) => (
            <div className="list-row admin-list-row" key={sponsor.id}>
              <button className="list-row-main" onClick={() => editSponsor(sponsor)} type="button">
                {sponsor.logoUrl ? <img alt="" className="admin-sponsor-thumb" src={sponsor.logoUrl} /> : null}
                <span>
                  <strong>{sponsor.name}</strong>
                  <small>
                    {sponsor.status} | {sponsor.websiteUrl} |{" "}
                    {sponsorPlacements.filter((placement) => placement.sponsorId === sponsor.id).length} placements
                  </small>
                </span>
              </button>
              <button className="icon-danger" onClick={() => deactivateSponsor(sponsor)} type="button" aria-label={`Deactivate ${sponsor.name}`}>
                <Trash2 aria-hidden="true" size={16} />
              </button>
              <button className="button ghost" onClick={() => startSponsorPlacement(sponsor)} type="button">
                Place sponsor
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid two">
        <form className="panel admin-form" onSubmit={handlePlacement}>
          <h2>{selectedPlacementId ? "Edit sponsor placement" : "Add sponsor placement"}</h2>
          <div className="field">
            <label htmlFor="placementSection">Section</label>
            <select className="input" id="placementSection" onChange={(event) => applySectionOption(event.target.value)} value={placementForm.sectionKey}>
              {sectionOptions.map((option) => (
                <option key={option.sectionKey} value={option.sectionKey}>
                  {option.sectionLabel}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="placementSponsor">Sponsor</label>
            <select
              className="input"
              id="placementSponsor"
              onChange={(event) => setPlacementForm({ ...placementForm, sponsorId: event.target.value })}
              value={placementForm.sponsorId}
            >
              <option value="">Choose sponsor</option>
              {sponsors.map((sponsor) => (
                <option key={sponsor.id} value={sponsor.id}>
                  {sponsor.name}
                </option>
              ))}
            </select>
          </div>
          <label className="toggle-row">
            <input
              checked={placementForm.enabled}
              onChange={(event) => setPlacementForm({ ...placementForm, enabled: event.target.checked })}
              type="checkbox"
            />
            Enabled
          </label>
          <div className="field">
            <label htmlFor="placementType">Placement type</label>
            <select
              className="input"
              id="placementType"
              onChange={(event) => setPlacementForm({ ...placementForm, placementType: event.target.value as SponsorPlacement["placementType"] })}
              value={placementForm.placementType}
            >
              <option value="section-header">section-header</option>
              <option value="card-footer">card-footer</option>
              <option value="alert-bar">alert-bar</option>
              <option value="radar-control">radar-control</option>
              <option value="live-banner">live-banner</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="placementLabel">Display label</label>
            <input
              className="input"
              id="placementLabel"
              onChange={(event) => setPlacementForm({ ...placementForm, displayLabel: event.target.value })}
              value={placementForm.displayLabel}
            />
          </div>
          <div className="field">
            <label htmlFor="placementRotation">Rotation group</label>
            <input
              className="input"
              id="placementRotation"
              onChange={(event) => setPlacementForm({ ...placementForm, rotationGroup: event.target.value })}
              value={placementForm.rotationGroup}
            />
          </div>
          <div className="field">
            <label htmlFor="placementPriority">Priority</label>
            <input
              className="input"
              id="placementPriority"
              onChange={(event) => setPlacementForm({ ...placementForm, priority: Number(event.target.value) })}
              type="number"
              value={placementForm.priority}
            />
          </div>
          <div className="admin-actions">
            <button className="button" disabled={isSavingPlacement || sponsors.length === 0} type="submit">
              {selectedPlacementId ? <Save aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
              {isSavingPlacement ? "Saving placement..." : selectedPlacementId ? "Update placement" : "Add placement"}
            </button>
            {selectedPlacementId ? (
              <button
                className="button ghost"
                onClick={() => {
                  setSelectedPlacementId("");
                  setPlacementForm(emptyPlacement);
                }}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
          {sponsors.length === 0 ? <p className="status-line">Add a sponsor before creating a placement.</p> : null}
        </form>

        <div className="panel admin-list">
          <h2>Sponsor placements</h2>
          {sponsorPlacements.map((placement) => (
            <button className="list-button" key={placement.id} onClick={() => editPlacement(placement)} type="button">
              <Edit3 aria-hidden="true" size={16} />
              {placement.sectionLabel} - {sponsors.find((sponsor) => sponsor.id === placement.sponsorId)?.name ?? "Sponsor"} (
              {placement.enabled ? "enabled" : "disabled"})
            </button>
          ))}
          {sponsorPlacements.length === 0 ? <p className="status-line">No sponsor placements assigned yet.</p> : null}
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
            <label htmlFor="teamImage">Headshot image upload</label>
            <input
              className="input"
              id="teamImage"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setTeamHeadshotFile(file);
                setTeamHeadshotPreview(file ? URL.createObjectURL(file) : "");
              }}
              type="file"
            />
            <p className="field-help">PNG, JPG, JPEG, or WEBP. Max 2 MB.</p>
          </div>
          {teamHeadshotPreview || teamMemberForm.photoUrl ? (
            <div className="sponsor-logo-preview">
              <img alt={`${teamMemberForm.name || "Team member"} headshot preview`} src={teamHeadshotPreview || teamMemberForm.photoUrl} />
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="teamLink">Optional social/link URL</label>
            <input
              className="input"
              id="teamLink"
              onChange={(event) => setTeamMemberForm({ ...teamMemberForm, socialUrl: event.target.value })}
              type="url"
              value={teamMemberForm.socialUrl}
            />
          </div>
          <label className="toggle-row">
            <input
              checked={teamMemberForm.status === "active"}
              onChange={(event) => setTeamMemberForm({ ...teamMemberForm, status: event.target.checked ? "active" : "inactive" })}
              type="checkbox"
            />
            Active team member
          </label>
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
            <button className="button" disabled={isSavingTeamMember} type="submit">
              {selectedTeamMemberId ? <Save aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
              {isSavingTeamMember ? "Saving member..." : selectedTeamMemberId ? "Update member" : "Add member"}
            </button>
            {selectedTeamMemberId ? (
              <button
                className="button ghost"
                onClick={() => {
                  setSelectedTeamMemberId("");
                  setTeamMemberForm(emptyTeamMember);
                  setTeamHeadshotFile(null);
                  setTeamHeadshotPreview("");
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
          {teamMembers.length === 0 ? <p className="status-line">No team members have been added yet.</p> : null}
        </div>
      </div>
    </section>
  );
}
