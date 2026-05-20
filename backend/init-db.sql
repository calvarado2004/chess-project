-- Chess app database initialization

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(20)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  display_name  VARCHAR(50)  NOT NULL DEFAULT '',
  avatar        VARCHAR(50)  NOT NULL DEFAULT 'king.svg',
  elo_rating    INT          NOT NULL DEFAULT 1200,
  elo_games     INT          NOT NULL DEFAULT 0,
  elo_wins      INT          NOT NULL DEFAULT 0,
  elo_losses    INT          NOT NULL DEFAULT 0,
  elo_draws     INT          NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT         NOT NULL,
  expires_at    TIMESTAMPTZ  NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);

CREATE TABLE IF NOT EXISTS games (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_player_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  black_player_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
  fen          TEXT         NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  result       VARCHAR(10)  NULL,
  time_control INT          NOT NULL DEFAULT 600,
  increment    INT          NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  finished_at  TIMESTAMPTZ  NULL
);

CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

CREATE TABLE IF NOT EXISTS moves (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID         NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  move_number INT          NOT NULL,
  uci_move    TEXT         NOT NULL,
  san         TEXT         NOT NULL,
  played_by   CHAR(1)      NOT NULL CHECK (played_by IN ('w', 'b')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);

CREATE TABLE IF NOT EXISTS game_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id         UUID         NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  opponent        VARCHAR(50)  NOT NULL,       -- 'Stockfish' or username
  opponent_elo    INT          NOT NULL DEFAULT 1500, -- Stockfish default ELO
  player_color    CHAR(1)      NOT NULL CHECK (player_color IN ('w', 'b')),
  result          VARCHAR(10)  NOT NULL,       -- 'win', 'loss', 'draw'
  player_elo_before INT        NOT NULL,
  player_elo_after  INT        NOT NULL,
  elo_change      INT          NOT NULL,
  performance_elo INT          NULL,           -- Performance rating for this game
  move_count      INT          NOT NULL DEFAULT 0,
  game_duration_s INT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_id ON game_history(game_id);
