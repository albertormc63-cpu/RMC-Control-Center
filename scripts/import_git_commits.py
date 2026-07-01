#!/usr/bin/env python3
import argparse
import json
import os
import re
import sqlite3
import subprocess
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT_DIR / "scripts" / "git_commit_sources.json"

SUPPORTED_TOOLS = {
    "rmcop_nike": "RMCOp-Nike",
    "rmc_control_center": "RMC Control Center",
    "rmc_mockuptool": "RMC MockupTool",
    "rmc_optimizador": "RMC Optimizador",
}

SCHEMA_SQL = """
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
"""


def load_dotenv_value(key):
    env_path = ROOT_DIR / ".env"
    if not env_path.exists():
        return None

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        if name.strip() == key:
            return value.strip().strip('"').strip("'")
    return None


def get_db_path(args):
    db_path = args.db_path or os.environ.get("RMC_DB_PATH") or load_dotenv_value("RMC_DB_PATH")
    if not db_path:
        raise RuntimeError("Falta configurar RMC_DB_PATH o pasar --db-path")
    return db_path


def run_git(repo_path, git_args):
    result = subprocess.run(
        ["git", "-C", str(repo_path), *git_args],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return result.stdout.rstrip("\n")


def validate_repo(repo_path):
    path = Path(repo_path).expanduser()
    if not path.exists():
        return path, "ruta inexistente"
    if not path.is_dir():
        return path, "la ruta no es carpeta"
    try:
        inside = run_git(path, ["rev-parse", "--is-inside-work-tree"])
    except subprocess.CalledProcessError as error:
        return path, f"no es repo Git: {error.stderr.strip()}"
    if inside != "true":
        return path, "no es repo Git"
    return path, None


def parse_shortstat(text):
    stats = {
        "files_changed": None,
        "insertions": None,
        "deletions": None,
    }
    if not text:
        return stats

    files_match = re.search(r"(\d+)\s+files?\s+changed", text)
    insertions_match = re.search(r"(\d+)\s+insertions?\(\+\)", text)
    deletions_match = re.search(r"(\d+)\s+deletions?\(-\)", text)

    if files_match:
        stats["files_changed"] = int(files_match.group(1))
    if insertions_match:
        stats["insertions"] = int(insertions_match.group(1))
    if deletions_match:
        stats["deletions"] = int(deletions_match.group(1))
    return stats


def get_commit_stats(repo_path, commit_hash):
    try:
        shortstat = run_git(repo_path, ["show", "--shortstat", "--format=", commit_hash])
    except subprocess.CalledProcessError:
        return {"files_changed": None, "insertions": None, "deletions": None}
    return parse_shortstat(shortstat)


def is_merge_commit(repo_path, commit_hash):
    try:
        parents_line = run_git(repo_path, ["rev-list", "--parents", "-n", "1", commit_hash])
    except subprocess.CalledProcessError:
        return 0
    return 1 if len(parents_line.split()) > 2 else 0


def get_branch_name(repo_path):
    try:
        return run_git(repo_path, ["rev-parse", "--abbrev-ref", "HEAD"])
    except subprocess.CalledProcessError:
        return None


def get_commits(repo_path, max_count=None):
    pretty = "%H%x1f%h%x1f%an%x1f%ae%x1f%aI%x1f%s%x1f%b%x1e"
    args = ["log", f"--pretty=format:{pretty}"]
    if max_count:
        args.insert(1, f"--max-count={max_count}")

    output = run_git(repo_path, args)
    commits = []
    for record in output.split("\x1e"):
        record = record.strip("\r\n")
        if not record:
            continue
        parts = record.split("\x1f", 6)
        if len(parts) != 7:
            continue
        commit_hash, short_hash, author_name, author_email, commit_date, subject, body = parts
        commits.append({
            "commit_hash": commit_hash,
            "short_hash": short_hash,
            "author_name": author_name,
            "author_email": author_email,
            "commit_date": commit_date,
            "commit_subject": subject or "(sin mensaje)",
            "commit_body": body.strip() or None,
        })
    return commits


def ensure_schema(conn):
    conn.executescript(SCHEMA_SQL)
    conn.commit()


def commit_exists(conn, tool_key, commit_hash):
    row = conn.execute(
        "SELECT 1 FROM rmc_git_commits WHERE tool_key = ? AND commit_hash = ?",
        (tool_key, commit_hash),
    ).fetchone()
    return row is not None


def insert_commit(conn, source, repo_path, branch_name, commit):
    stats = get_commit_stats(repo_path, commit["commit_hash"])
    is_merge = is_merge_commit(repo_path, commit["commit_hash"])
    conn.execute(
        """
        INSERT OR IGNORE INTO rmc_git_commits (
          tool_key, tool_name, repo_name, repo_path, branch_name,
          commit_hash, short_hash, author_name, author_email, commit_date,
          commit_subject, commit_body, files_changed, insertions, deletions,
          is_merge, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """,
        (
            source["tool_key"],
            source["tool_name"],
            source["repo_name"],
            str(repo_path),
            branch_name,
            commit["commit_hash"],
            commit["short_hash"],
            commit["author_name"],
            commit["author_email"],
            commit["commit_date"],
            commit["commit_subject"],
            commit["commit_body"],
            stats["files_changed"],
            stats["insertions"],
            stats["deletions"],
            is_merge,
        ),
    )
    return conn.total_changes


def normalize_source(args):
    if args.tool_key not in SUPPORTED_TOOLS:
        raise RuntimeError(f"tool_key no soportado: {args.tool_key}")
    return {
        "tool_key": args.tool_key,
        "tool_name": args.tool_name or SUPPORTED_TOOLS[args.tool_key],
        "repo_name": args.repo_name or args.tool_name or SUPPORTED_TOOLS[args.tool_key],
        "repo_path": args.repo_path,
    }


def load_sources(config_path):
    path = Path(config_path)
    if not path.exists():
        raise RuntimeError(f"No existe config: {path}")
    sources = json.loads(path.read_text(encoding="utf-8"))
    valid_sources = []
    for source in sources:
        tool_key = source.get("tool_key")
        if tool_key not in SUPPORTED_TOOLS:
            print(f"[skip] tool_key no soportado: {tool_key}")
            continue
        valid_sources.append({
            "tool_key": tool_key,
            "tool_name": source.get("tool_name") or SUPPORTED_TOOLS[tool_key],
            "repo_name": source.get("repo_name") or source.get("tool_name") or SUPPORTED_TOOLS[tool_key],
            "repo_path": source.get("repo_path"),
        })
    return valid_sources


def import_source(conn, source, max_count=None):
    repo_path, error = validate_repo(source.get("repo_path") or "")
    if error:
        print(f"[skip] {source.get('tool_key')}: {error} ({source.get('repo_path')})")
        return {"new": 0, "existing": 0, "errors": 1}

    branch_name = get_branch_name(repo_path)
    try:
        commits = get_commits(repo_path, max_count=max_count)
    except subprocess.CalledProcessError as error:
        print(f"[error] {source['tool_key']}: git log fallo: {error.stderr.strip()}")
        return {"new": 0, "existing": 0, "errors": 1}

    new_count = 0
    existing_count = 0
    error_count = 0

    for commit in commits:
        if commit_exists(conn, source["tool_key"], commit["commit_hash"]):
            existing_count += 1
            continue
        before = conn.total_changes
        try:
            insert_commit(conn, source, repo_path, branch_name, commit)
            if conn.total_changes > before:
                new_count += 1
            else:
                existing_count += 1
        except sqlite3.Error as error:
            error_count += 1
            print(f"[error] {source['tool_key']} {commit['short_hash']}: {error}")

    conn.commit()
    print(
        f"[ok] {source['tool_key']}: nuevos={new_count}, existentes={existing_count}, errores={error_count}"
    )
    return {"new": new_count, "existing": existing_count, "errors": error_count}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Importa commits locales a rmc_git_commits para RMC Control System."
    )
    parser.add_argument("--db-path", help="Ruta SQLite. Default: RMC_DB_PATH o .env")
    parser.add_argument("--repo-path", help="Ruta local del repo Git")
    parser.add_argument("--tool-key", choices=sorted(SUPPORTED_TOOLS.keys()))
    parser.add_argument("--tool-name")
    parser.add_argument("--repo-name")
    parser.add_argument("--all", action="store_true", help="Importa todos los repos del JSON")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG), help="Config JSON para --all")
    parser.add_argument("--max-count", type=int, help="Limita commits por repo")
    return parser.parse_args()


def main():
    args = parse_args()
    db_path = get_db_path(args)
    conn = sqlite3.connect(db_path)
    ensure_schema(conn)

    if args.all:
      sources = load_sources(args.config)
    else:
      if not args.repo_path or not args.tool_key:
          raise RuntimeError("Modo individual requiere --repo-path y --tool-key")
      sources = [normalize_source(args)]

    totals = {"new": 0, "existing": 0, "errors": 0}
    for source in sources:
        result = import_source(conn, source, max_count=args.max_count)
        for key in totals:
            totals[key] += result[key]

    conn.close()
    print(
        f"Total: nuevos={totals['new']}, existentes={totals['existing']}, errores={totals['errors']}"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"[fatal] {error}", file=sys.stderr)
        sys.exit(1)
