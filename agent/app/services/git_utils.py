from __future__ import annotations


def sanitize_github_remote_url(repo_url: str) -> str:
    """Return a sanitized HTTPS GitHub URL without embedded credentials.

    - Converts SSH format to HTTPS
    - Strips any oauth2 credentials if present
    - Leaves other URLs unchanged
    """
    try:
        if repo_url.startswith("git@github.com:"):
            repo_path = repo_url.replace("git@github.com:", "")
            if not repo_path.endswith(".git"):
                repo_path = f"{repo_path}.git"
            return f"https://github.com/{repo_path}"

        if repo_url.startswith("https://oauth2:") and "@github.com/" in repo_url:
            rest = repo_url.split("@github.com/", 1)[1]
            return f"https://github.com/{rest}"

        if repo_url.startswith("https://github.com/"):
            return repo_url

        return repo_url
    except Exception:
        return repo_url
