import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { PostDetail, Reply } from "@aerolearn/shared";
import { api, timeAgo } from "../api";
import { useAuth } from "../auth";
import { VoteButton } from "./Community";

export function ThreadPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ post: PostDetail }>(`/posts/${id}`).then((r) => setPost(r.post)).catch((e) => setError(e.message));
  }, [id, user?.id]);

  const reply = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true); setError("");
    const form = e.currentTarget;
    try {
      const r = await api<{ reply: Reply }>(`/posts/${id}/replies`, { method: "POST", body: { body: new FormData(form).get("body") } });
      setPost((p) => p && { ...p, replies: [...p.replies, r.reply], replyCount: p.replyCount + 1 }); form.reset();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };
  const removePost = async () => {
    if (!window.confirm("Delete this question and all its replies?")) return;
    await api(`/posts/${id}`, { method: "DELETE" }); navigate("/community");
  };
  const removeReply = async (rid: string) => {
    await api(`/replies/${rid}`, { method: "DELETE" });
    setPost((p) => p && { ...p, replies: p.replies.filter((r) => r.id !== rid), replyCount: p.replyCount - 1 });
  };

  if (error && !post) return <section><p className="error">{error}</p><Link to="/community">← Back to Community</Link></section>;
  if (!post) return <p className="sub">Loading…</p>;
  return (
    <section className="thread">
      <Link to="/community" className="small">← All discussions</Link>
      <article className="card post mt">
        <VoteButton post={post} onChange={(v) => setPost({ ...post, ...v })} />
        <div className="post-body">
          <span className="badge">{post.tag}</span>
          <h2 className="no-bar">{post.title}</h2>
          <p className="sub small">{post.author.avatar} {post.author.displayName} · {timeAgo(post.createdAt)}</p>
          <p className="pre">{post.body}</p>
          {post.mine && <button type="button" className="btn ghost small danger" onClick={removePost}>🗑 Delete question</button>}
        </div>
      </article>
      <h3 className="mt">{post.replies.length} {post.replies.length === 1 ? "reply" : "replies"}</h3>
      <ul className="reply-list">
        {post.replies.map((r) => (
          <li key={r.id} className="card reply">
            <p className="sub small">{r.author.avatar} {r.author.displayName} · {timeAgo(r.createdAt)}</p>
            <p className="pre">{r.body}</p>
            {r.mine && <button type="button" className="link-btn" onClick={() => removeReply(r.id)}>Delete</button>}
          </li>
        ))}
      </ul>
      {user ? (
        <form className="card form" onSubmit={reply}>
          <label>Your reply<textarea name="body" rows={4} maxLength={2000} required /></label>
          {error && <p className="error">{error}</p>}
          <button className="btn" disabled={busy}>{busy ? "Posting…" : "Post reply"}</button>
        </form>
      ) : <p className="sub"><Link to={`/login?next=/community/${post.id}`}>Sign in</Link> to reply.</p>}
    </section>
  );
}
