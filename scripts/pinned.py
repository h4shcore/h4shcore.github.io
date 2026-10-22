#!/usr/bin/env python3
"""Fetch a GitHub user's pinned repositories into data/pinned.json.

    python3 scripts/pinned.py [username] [output-file]

Defaults: username "h4shcore", output "data/pinned.json".

GitHub only exposes pinned repos through its GraphQL API, which needs a token
(any token works, no scopes needed). The script tries, in order:
  1. GraphQL, using $GITHUB_TOKEN, $GH_TOKEN or `gh auth token`
  2. scraping the public profile page (no token, but may break if GitHub
     changes its HTML)
The existing output file is left alone if both fail.
"""
import datetime
import html
import json
import os
import re
import subprocess
import sys
import urllib.request

UA = "pinned-fetch (personal site)"

QUERY = """
query($login: String!) {
  user(login: $login) {
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes {
        ... on Repository {
          name
          description
          url
          homepageUrl
          stargazerCount
          forkCount
          primaryLanguage { name }
        }
      }
    }
  }
}
"""


def get_token():
    for var in ("GITHUB_TOKEN", "GH_TOKEN"):
        if os.environ.get(var):
            return os.environ[var]
    try:
        out = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, timeout=10)
        if out.returncode == 0 and out.stdout.strip():
            return out.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        pass
    return None


def via_graphql(user, token):
    body = json.dumps({"query": QUERY, "variables": {"login": user}}).encode()
    req = urllib.request.Request(
        "https://api.github.com/graphql",
        data=body,
        headers={"Authorization": "bearer " + token, "Content-Type": "application/json", "User-Agent": UA},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.load(resp)
    if data.get("errors"):
        raise RuntimeError(data["errors"][0].get("message", "GraphQL error"))
    repos = []
    for n in data["data"]["user"]["pinnedItems"]["nodes"]:
        if not n:
            continue
        repos.append({
            "name": n["name"],
            "description": n.get("description") or "",
            "url": n["url"],
            "homepage": n.get("homepageUrl") or "",
            "stars": n.get("stargazerCount") or 0,
            "forks": n.get("forkCount") or 0,
            "language": (n.get("primaryLanguage") or {}).get("name", ""),
        })
    return repos


def clean(fragment):
    text = re.sub(r"<[^>]+>", "", fragment)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def to_int(fragment):
    t = clean(fragment).lower().replace(",", "")
    m = re.search(r"([\d.]+)\s*(k?)", t)
    if not m:
        return 0
    n = float(m.group(1)) * (1000 if m.group(2) else 1)
    return int(n)


def parse_profile(page):
    repos, seen = [], set()
    for chunk in page.split("pinned-item-list-item-content")[1:]:
        m = re.search(r'href="/([^"/?#]+)/([^"/?#]+)"', chunk)
        if not m:
            continue
        owner, name = m.group(1), m.group(2)
        if (owner, name) in seen:
            continue
        seen.add((owner, name))
        d = re.search(r'class="pinned-item-desc[^"]*"[^>]*>(.*?)</p>', chunk, re.S)
        lang = re.search(r'itemprop="programmingLanguage"[^>]*>([^<]+)<', chunk)
        stars = re.search(r'href="/%s/%s/stargazers"[^>]*>(.*?)</a>' % (re.escape(owner), re.escape(name)), chunk, re.S)
        forks = re.search(r'href="/%s/%s/(?:forks|network/members)[^"]*"[^>]*>(.*?)</a>' % (re.escape(owner), re.escape(name)), chunk, re.S)
        repos.append({
            "name": name,
            "description": clean(d.group(1)) if d else "",
            "url": "https://github.com/%s/%s" % (owner, name),
            "homepage": "",
            "stars": to_int(stars.group(1)) if stars else 0,
            "forks": to_int(forks.group(1)) if forks else 0,
            "language": clean(lang.group(1)) if lang else "",
        })
    return repos


def via_scrape(user):
    req = urllib.request.Request("https://github.com/" + user, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return parse_profile(resp.read().decode("utf-8", "replace"))


def main():
    user = sys.argv[1] if len(sys.argv) > 1 else "h4shcore"
    out = sys.argv[2] if len(sys.argv) > 2 else "data/pinned.json"

    repos, token = None, get_token()
    if token:
        try:
            repos = via_graphql(user, token)
            print("fetched via GraphQL API", file=sys.stderr)
        except Exception as e:  # noqa: BLE001
            print("GraphQL failed: %s" % e, file=sys.stderr)
    if not repos:
        try:
            repos = via_scrape(user)
            print("fetched by scraping the profile page", file=sys.stderr)
        except Exception as e:  # noqa: BLE001
            print("scrape failed: %s" % e, file=sys.stderr)
    if not repos:
        sys.exit("could not fetch pinned repos (is the profile public? try setting GITHUB_TOKEN)")

    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with open(out, "w") as f:
        json.dump({"user": user, "fetched": datetime.date.today().isoformat(), "repos": repos}, f, indent=2)
        f.write("\n")
    print("wrote %d repos to %s" % (len(repos), out), file=sys.stderr)


if __name__ == "__main__":
    main()
