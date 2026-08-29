CREATE TABLE IF NOT EXISTS blocked_extension (
  id          integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  extension   varchar(20)  NOT NULL,
  kind        text         NOT NULL,
  is_blocked  boolean      NOT NULL DEFAULT false,
  sort_order  smallint     NOT NULL DEFAULT 0,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT blocked_extension_extension_key   UNIQUE (extension),
  CONSTRAINT blocked_extension_kind_check      CHECK (kind IN ('fixed', 'custom')),
  CONSTRAINT blocked_extension_format_check    CHECK (extension ~ '^[a-z0-9]{1,20}$')
);

CREATE TABLE IF NOT EXISTS upload_attempt (
  id             bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  original_name  varchar(255) NOT NULL,  -- 표시·감사용 정규화 파일명(원본 바이트 아님)
  extension      varchar(20),  -- 마지막 dot-segment 1개(통상적 의미의 확장자)
  declared_mime  varchar(128),
  detected_mime  varchar(128),
  size_bytes     integer      NOT NULL,
  outcome        text         NOT NULL,
  reason_code    varchar(48),
  blob_pathname  text,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT upload_attempt_outcome_check CHECK (outcome IN ('accepted', 'rejected'))
);

CREATE INDEX IF NOT EXISTS upload_attempt_created_at_idx
  ON upload_attempt (created_at DESC);

INSERT INTO blocked_extension (extension, kind, is_blocked, sort_order) VALUES
  ('bat', 'fixed', false, 1), ('cmd', 'fixed', false, 2), ('com', 'fixed', false, 3),
  ('cpl', 'fixed', false, 4), ('exe', 'fixed', false, 5), ('scr', 'fixed', false, 6),
  ('js',  'fixed', false, 7)
ON CONFLICT (extension) DO NOTHING;
