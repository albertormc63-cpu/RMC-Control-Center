function tableExists(db, tableName) {
  return Boolean(db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name = ?
  `).get(tableName));
}

function hasGitCommitTable(db) {
  return tableExists(db, "rmc_git_commits");
}

function buildCommitFilters(filters = {}) {
  const where = [];
  const params = [];

  if (filters.toolKey) {
    where.push("tool_key = ?");
    params.push(filters.toolKey);
  }

  if (filters.dateFrom) {
    where.push("commit_date >= ?");
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    where.push("commit_date <= ?");
    params.push(filters.dateTo);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params
  };
}

function getRecentCommits(db, filters = {}) {
  if (!hasGitCommitTable(db)) {
    return [];
  }

  const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
  const offset = Math.max(0, Number(filters.offset) || 0);
  const { whereSql, params } = buildCommitFilters(filters);

  return db.prepare(`
    SELECT
      id,
      tool_key,
      tool_name,
      repo_name,
      repo_path,
      branch_name,
      commit_hash,
      short_hash,
      author_name,
      author_email,
      commit_date,
      commit_subject,
      commit_body,
      files_changed,
      insertions,
      deletions,
      is_merge,
      created_at,
      updated_at
    FROM rmc_git_commits
    ${whereSql}
    ORDER BY commit_date DESC, id DESC
    LIMIT ?
    OFFSET ?
  `).all(...params, limit, offset);
}

function getCommitCount(db, filters = {}) {
  if (!hasGitCommitTable(db)) {
    return 0;
  }

  const { whereSql, params } = buildCommitFilters(filters);
  const row = db.prepare(`
    SELECT COUNT(*) AS total
    FROM rmc_git_commits
    ${whereSql}
  `).get(...params);

  return row?.total || 0;
}

function getCommitCountsByTool(db) {
  if (!hasGitCommitTable(db)) {
    return [];
  }

  return db.prepare(`
    SELECT
      tool_key,
      tool_name,
      COUNT(*) AS total,
      MAX(commit_date) AS latest_commit_date
    FROM rmc_git_commits
    GROUP BY tool_key, tool_name
    ORDER BY tool_key
  `).all();
}

function getLatestCommitByTool(db) {
  if (!hasGitCommitTable(db)) {
    return [];
  }

  return db.prepare(`
    SELECT c.*
    FROM rmc_git_commits c
    INNER JOIN (
      SELECT tool_key, MAX(commit_date) AS latest_commit_date
      FROM rmc_git_commits
      GROUP BY tool_key
    ) latest
      ON latest.tool_key = c.tool_key
     AND latest.latest_commit_date = c.commit_date
    ORDER BY c.tool_key
  `).all();
}

module.exports = {
  hasGitCommitTable,
  getRecentCommits,
  getCommitCount,
  getCommitCountsByTool,
  getLatestCommitByTool
};
