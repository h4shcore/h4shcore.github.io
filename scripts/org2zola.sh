#!/usr/bin/env bash
# org2zola: turn Org-mode posts into Zola markdown (needs pandoc).
#
#   org2zola [content-dir]        (default: content)
#
# For every foo.org it writes foo.md next to it, with Zola front matter
# built from the Org header lines:
#   #+TITLE:        title
#   #+DATE:         date  (2026-10-23, or an Org timestamp like <2026-10-23 Fri>)
#   #+DESCRIPTION:  description
#   #+FILETAGS:     tags  (:nix:linux:  or  nix linux  or  nix, linux)
#   #+DRAFT:        true  to hide the post from builds
# Generated files carry a marker comment; hand-written .md files are never touched.
set -euo pipefail

dir="${1:-content}"

hdr() { # hdr FILE KEY -> value of the first "#+KEY: value" line
  grep -i -m1 "^#+$2:" "$1" | sed -E 's/^#\+[A-Za-z_]+:[[:space:]]*//' || true
}
esc() { sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

find "$dir" -type f -name '*.org' -print0 | while IFS= read -r -d '' f; do
  out="${f%.org}.md"

  if [ -e "$out" ] && ! grep -q 'generated-from-org' "$out"; then
    printf 'org2zola: skipping %s (%s is hand-written)\n' "$f" "$out" >&2
    continue
  fi
  if [ -e "$out" ] && [ "$out" -nt "$f" ]; then
    continue
  fi

  title=$(hdr "$f" TITLE)
  [ -n "$title" ] || title=$(basename "${f%.org}")
  desc=$(hdr "$f" DESCRIPTION)
  draft=$(hdr "$f" DRAFT | tr '[:upper:]' '[:lower:]')

  post_date=$( { hdr "$f" DATE | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -n1; } || true)
  [ -n "$post_date" ] || post_date=$(date -r "$f" +%F)

  raw=$(hdr "$f" FILETAGS)
  [ -n "$raw" ] || raw=$(hdr "$f" TAGS)
  [ -n "$raw" ] || raw=$(hdr "$f" KEYWORDS)
  raw=$(printf '%s' "$raw" | tr ':,' '  ')
  read -ra words <<< "$raw"
  taglist=""
  for t in "${words[@]}"; do
    taglist="${taglist:+$taglist, }\"$t\""
  done

  tmp=$(mktemp)
  {
    echo "+++"
    printf 'title = "%s"\n' "$(printf '%s' "$title" | esc)"
    printf 'date = %s\n' "$post_date"
    if [ -n "$desc" ]; then
      printf 'description = "%s"\n' "$(printf '%s' "$desc" | esc)"
    fi
    if [ "$draft" = "true" ] || [ "$draft" = "t" ] || [ "$draft" = "yes" ]; then
      echo "draft = true"
    fi
    if [ -n "$taglist" ]; then
      echo
      echo "[taxonomies]"
      echo "tags = [$taglist]"
    fi
    echo "+++"
    echo
    printf '<!-- generated-from-org: %s (edit the .org file, not this one) -->\n\n' "$(basename "$f")"
    pandoc -f org -t gfm --wrap=none --shift-heading-level-by=1 "$f"
  } > "$tmp"
  mv "$tmp" "$out"
  printf 'org2zola: %s -> %s\n' "$f" "$out" >&2
done
