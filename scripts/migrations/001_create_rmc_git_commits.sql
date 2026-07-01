CREATE TABLE IF NOT EXISTS rmc_git_commits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    tool_key TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    repo_path TEXT,

    branch_name TEXT,
    commit_hash TEXT NOT NULL,
    short_hash TEXT,

    author_name TEXT,
    author_email TEXT,
    commit_date TEXT NOT NULL,

    commit_subject TEXT NOT NULL,
    commit_body TEXT,

    files_changed INTEGER,
    insertions INTEGER,
    deletions INTEGER,

    is_merge INTEGER DEFAULT 0,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT,

    UNIQUE(tool_key, commit_hash)
);

CREATE INDEX IF NOT EXISTS idx_rmc_git_commits_tool_key
ON rmc_git_commits(tool_key);

CREATE INDEX IF NOT EXISTS idx_rmc_git_commits_commit_date
ON rmc_git_commits(commit_date);

CREATE INDEX IF NOT EXISTS idx_rmc_git_commits_tool_date
ON rmc_git_commits(tool_key, commit_date);
