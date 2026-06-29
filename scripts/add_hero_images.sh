#!/bin/bash
# add_hero_images.sh — optimize hero backdrop images and refresh the slideshow.
#
# Just drop image(s) — any size, any format (jpg/png/heic/webp/tiff) — into
#   assets/images/hero_images/
# then run:
#   ./scripts/add_hero_images.sh          # optimize + update manifest
#   ./scripts/add_hero_images.sh --push   # ...and commit + push to deploy
#
# For each image the script produces a web-optimized <name>.jpg (max 1920px
# wide, quality auto-stepped to stay under ~500KB) and regenerates the
# HERO_MANIFEST list in js/main.js, which the page reads to build the
# crossfading backdrop slideshow. Existing per-image credit lines are
# preserved; brand-new images get a placeholder credit for you to edit.
#
# Heavy originals (the non-jpg you dropped, or a backup of an oversized jpg)
# stay on disk as masters but are gitignored — only the optimized .jpg ships.

set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
HERO="$REPO/assets/images/hero_images"
ORIG="$HERO/originals"
MAINJS="$REPO/js/main.js"

MAX_WIDTH=1920
MAX_BYTES=512000          # ~500KB ceiling per CLAUDE.md
QUALITIES=(88 84 80 76 72 68)

mkdir -p "$HERO" "$ORIG"

# optimize <source> <output.jpg> — resize to <=MAX_WIDTH and step quality down
# until the file is under MAX_BYTES (or the lowest quality is reached).
optimize() {
  local src="$1" out="$2" q size
  local w
  w=$(sips -g pixelWidth "$src" | awk '/pixelWidth/{print $2}')
  for q in "${QUALITIES[@]}"; do
    if [ -n "$w" ] && [ "$w" -gt "$MAX_WIDTH" ]; then
      sips -s format jpeg -s formatOptions "$q" --resampleWidth "$MAX_WIDTH" "$src" --out "$out" >/dev/null
    else
      sips -s format jpeg -s formatOptions "$q" "$src" --out "$out" >/dev/null
    fi
    size=$(stat -f%z "$out")
    [ "$size" -le "$MAX_BYTES" ] && break
  done
  echo "$size"
}

shopt -s nullglob nocaseglob
count=0

# Pass 1: non-jpg masters (png/heic/webp/tiff) -> optimized <name>.jpg.
for src in "$HERO"/*.{png,heic,webp,tif,tiff}; do
  base=$(basename "$src"); base=${base%.*}
  out="$HERO/$base.jpg"
  # Skip only if the jpg is already up to date AND within the size budget;
  # an over-budget jpg always gets re-optimized (quality stepped down).
  if [ -f "$out" ] && [ "$out" -nt "$src" ] && [ "$(stat -f%z "$out")" -le "$MAX_BYTES" ]; then
    continue
  fi
  size=$(optimize "$src" "$out")
  echo "  $(basename "$src") -> $base.jpg ($(echo "$size" | awk '{printf "%dKB", $1/1024}'))"
  [ "$size" -gt "$MAX_BYTES" ] && echo "    NOTE: still over ~500KB at lowest quality — consider a smaller crop."
  count=$((count + 1))
done

# Pass 2: standalone jpgs that have no master and are oversized -> optimize
# in place, backing up the original you dropped into originals/ first.
for src in "$HERO"/*.{jpg,jpeg}; do
  base=$(basename "$src"); base=${base%.*}
  # Has a non-jpg master? Then it's an output from pass 1 — leave it alone.
  for m in "$HERO/$base".{png,heic,webp,tif,tiff}; do
    [ -f "$m" ] && continue 2
  done
  w=$(sips -g pixelWidth "$src" | awk '/pixelWidth/{print $2}')
  size=$(stat -f%z "$src")
  if { [ -n "$w" ] && [ "$w" -gt "$MAX_WIDTH" ]; } || [ "$size" -gt "$MAX_BYTES" ]; then
    cp "$src" "$ORIG/$(basename "$src")"
    newsize=$(optimize "$ORIG/$(basename "$src")" "$HERO/$base.jpg")
    echo "  $(basename "$src") optimized in place ($(echo "$newsize" | awk '{printf "%dKB", $1/1024}'); original kept in originals/)"
    count=$((count + 1))
  fi
done
shopt -u nullglob nocaseglob

# Always regenerate the manifest so removed images drop out and new ones appear,
# even when nothing needed re-optimizing this run.
python3 - "$MAINJS" "$HERO" <<'EOF'
import re, sys, json, pathlib
mainjs, hero = sys.argv[1], pathlib.Path(sys.argv[2])
present = sorted(p.name for p in hero.glob("*.jpg"))

src = open(mainjs).read()
m = re.search(r"const HERO_MANIFEST = \[(.*?)\];", src, flags=re.S)
assert m, "HERO_MANIFEST array not found in js/main.js"

# Preserve existing credits (keyed by filename) and the existing play order.
existing, order = {}, []
for em in re.finditer(r'\{\s*file:\s*("(?:[^"\\]|\\.)*")\s*,\s*credit:\s*("(?:[^"\\]|\\.)*")\s*\}', m.group(1)):
    f = json.loads(em.group(1))   # parse JS/JSON string literals (handles \" and unicode)
    c = json.loads(em.group(2))
    existing[f] = c
    order.append(f)

PLACEHOLDER = "Placeholder credit — describe this image, then: Credit: [Name / Institution]."
ordered = [f for f in order if f in present] + [f for f in present if f not in order]

lines = ",\n".join(
    f"    {{ file: {json.dumps(f, ensure_ascii=False)}, credit: {json.dumps(existing.get(f, PLACEHOLDER), ensure_ascii=False)} }}"
    for f in ordered)
out = f"const HERO_MANIFEST = [\n{lines}\n  ];"
open(mainjs, "w").write(src[:m.start()] + out + src[m.end():])
print(f"Updated HERO_MANIFEST: {len(ordered)} image(s)")
new = [f for f in present if f not in order]
if new:
    print("  New (edit their placeholder credit in js/main.js): " + ", ".join(new))
EOF

node --check "$MAINJS" && echo "js/main.js syntax OK"

if [ "${1:-}" = "--push" ]; then
  cd "$REPO"
  git add assets/images/hero_images js/main.js
  git commit -m "Update hero backdrop slideshow images"
  git push
  echo "Pushed — live in ~1 minute."
else
  echo "Review locally, then commit & push to deploy (or re-run with --push)."
fi
