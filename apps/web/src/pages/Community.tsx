import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { POST_TAGS, type PostSummary } from "@aerolearn/shared";
import { api, timeAgo } from "../api";
import { useAuth } from "../auth";

type Sort = "new" | "top" | "open";

export function VoteButton({ post, onChange }: { post: Pick<PostSummary, "id" | "votes" | "votedByMe">; onChange: (v: { votes: number; votedByMe: boolean }) => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className={`vote${post.votedByMe ? " on" : ""}`} disabled={!user || busy} title={user ? "Upvote" : "Sign in to vote"}
      onClick={async (e) => { e.preventDefault(); setBusy(true); try { onChange(await api(`/posts/${post.id}/vote`, { method: "PUT" })); } finally { setBusy(false); } }}>
      ▲<b>{post.votes}</b>
    </button>
  );
}

export function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [q, setQ] = useState(""), [tag, setTag] = useState(""), [sort, setSort] = useState<Sort>("new");
  const [error, setError] = useState(""), [formError, setFormError] = useState(""), [busy, setBusy] = useState(false);

  useEffect(() => {
    const ctl = setTimeout(() => {
      const p = new URLSearchParams({ sort }); if (q.trim()) p.set("q", q.trim()); if (tag) p.set("tag", tag);
      api<{ posts: PostSummary[] }>(`/posts?${p}`).then((r) => { setPosts(r.posts); setError(""); }).catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(ctl);
  }, [q, tag, sort, user?.id]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setFormError(""); setBusy(true);
    const form = e.currentTarget, f = new FormData(form);
    try {
      const r = await api<{ post: PostSummary }>("/posts", { method: "POST", body: { tag: f.get("tag"), title: f.get("title"), body: f.get("body") } });
      setPosts((p) => [r.post, ...(p ?? [])]); form.reset();
    } catch (err) { setFormError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <section>
      <h2>Community</h2>
      <p className="sub">Ask questions and discuss aviation with other learners. Be kind, stay on topic, and remember: this isn't for real-world flight advice.</p>
      <div className="community">
        <div>
          <div className="controls">
            <input type="search" placeholder="Search discussions…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search discussions" />
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
              <option value="new">Newest</option><option value="top">Most upvoted</option><option value="open">Unanswered first</option>
            </select>
          </div>
          <div className="chips">
            {["", ...POST_TAGS].map((t) => <button type="button" key={t} className={`chip${tag === t ? " active" : ""}`} onClick={() => setTag(t)}>{t || "All"}</button>)}
          </div>
          {error && <p className="error">{error}</p>}
          {posts === null ? <p className="sub">Loading discussions…</p> : posts.length === 0 ? <p className="sub">No discussions yet{q || tag ? " match that" : ""}. Start one!</p> : (
            <ul className="post-list">
              {posts.map((p) => (
                <li key={p.id} className="card post">
                  <VoteButton post={p} onChange={(v) => setPosts((all) => all!.map((x) => (x.id === p.id ? { ...x, ...v } : x)))} />
                  <Link to={`/community/${p.id}`} className="post-body">
                    <span className="badge">{p.tag}</span>
                    <h3>{p.title}</h3>
                    <p className="sub small">{p.author.avatar} {p.author.displayName} · {timeAgo(p.createdAt)} · {p.replyCount} {p.replyCount === 1 ? "reply" : "replies"}{p.replyCount === 0 ? " · unanswered" : ""}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {user ? (
          <form className="card form" onSubmit={submit}>
            <div className="label">Ask a question</div>
            <select name="tag" defaultValue="General">{POST_TAGS.map((t) => <option key={t}>{t}</option>)}</select>
            <input name="title" placeholder="Question title, e.g. Why do pilots say 'niner'?" minLength={5} maxLength={120} required />
            <textarea name="body" rows={5} placeholder="Add details…" maxLength={2000} required />
            {formError && <p className="error">{formError}</p>}
            <button className="btn" disabled={busy}>{busy ? "Posting…" : "Post question"}</button>
            <p className="sub small">Posting as {user.avatar} {user.displayName}.</p>
          </form>
        ) : (
          <div className="card">
            <div className="label">Join the discussion</div>
            <p>Sign in to ask questions, reply and vote. Anyone can read.</p>
            <Link className="btn" to="/login?next=/community">Sign in</Link> <Link className="btn ghost" to="/register?next=/community">Create account</Link>
          </div>
        )}
      </div>
    </section>
  );
}
