-- AeroLearn initial schema
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name  text NOT NULL,
  avatar        text NOT NULL DEFAULT '🧑‍✈️',
  goal          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Only a SHA-256 hash of each session token is stored, never the token itself.
CREATE TABLE sessions (
  id         text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

-- Learning progress: one JSON document per user, mirroring the classic site's localStorage keys.
CREATE TABLE progress (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag        text NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_created_idx ON posts(created_at DESC);

CREATE TABLE replies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX replies_post_idx ON replies(post_id, created_at);

CREATE TABLE post_votes (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);
