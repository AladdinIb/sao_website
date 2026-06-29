#!/bin/bash
# add_discovery_images.sh — optimize SAO Discoveries card images and stub the list.
#
# Drop image(s) — any size, any format (jpg/png/heic/webp/tiff) — into
#   assets/images/discoveries/
# then run:
#   ./scripts/add_discovery_images.sh          # optimize + append stub entries
#   ./scripts/add_discovery_images.sh --push   # ...and commit + push to deploy
#
# Each image is center-cropped to a 1080x620 card JPEG (quality auto-stepped to
# stay under ~500KB). For any image not yet referenced in the DISCOVERIES array
# in js/main.js, a stub entry { title, blurb, image, credit } is appended for you
# to fill in. Existing entries (and the commented "ready to go live" block) are
# left untouched. Heavy originals stay on disk as gitignored masters.

set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DISC="$REPO/assets/images/discoveries"
ORIG="$DISC/originals"
MAINJS="$REPO/js/main.js"

CW=1080; CH=620
MAX_BYTES=512000
QUALITIES=(82 78 74 70 66)

mkdir -p "$DISC" "$ORIG"

# cover <source> <output.jpg> — center-crop to CWxCH, step quality to fit budget.
cover() {
  local src="$1" out="$2" q size sw sh tmp
  sw=$(sips -g pixelWidth "$src" | awk '/pixelWidth/{print $2}')
  sh=$(sips -g pixelHeight "$src" | awk '/pixelHeight/{print $2}')
  tmp=$(mktemp -t disc).png
  # Enlarge whichever dimension is short, then center-crop to exact size.
  if [ "$((sw*CH))" -ge "$((sh*CW))" ]; then
    sips --resampleHeight "$CH" "$src" --out "$tmp" >/dev/null
  else
    sips --resampleWidth "$CW" "$src" --out "$tmp" >/dev/null
  fi
  sips --cropToHeightWidth "$CH" "$CW" "$tmp" >/dev/null
  for q in "${QUALITIES[@]}"; do
    sips -s format jpeg -s formatOptions "$q" "$tmp" --out "$out" >/dev/null
    size=$(stat -f%z "$out")
    [ "$size" -le "$MAX_BYTES" ] && break
  done
  rm -f "$tmp"
  echo "$size"
}

shopt -s nullglob nocaseglob
count=0

# Pass 1: non-jpg masters -> optimized <name>.jpg.
for src in "$DISC"/*.{png,heic,webp,tif,tiff}; do
  base=$(basename "$src"); base=${base%.*}
  out="$DISC/$base.jpg"
  if [ -f "$out" ] && [ "$out" -nt "$src" ] && [ "$(stat -f%z "$out")" -le "$MAX_BYTES" ]; then continue; fi
  size=$(cover "$src" "$out")
  echo "  $(basename "$src") -> $base.jpg ($(echo "$size" | awk '{printf "%dKB", $1/1024}'))"
  count=$((count + 1))
done

# Pass 2: standalone jpgs (not the shared placeholder, not a pass-1 output) that
# aren't already card-sized -> crop in place, backing up the original first.
for src in "$DISC"/*.{jpg,jpeg}; do
  base=$(basename "$src"); base=${base%.*}
  [ "$base" = "_placeholder" ] && continue
  for m in "$DISC/$base".{png,heic,webp,tif,tiff}; do [ -f "$m" ] && continue 2; done
  w=$(sips -g pixelWidth "$src" | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$src" | awk '/pixelHeight/{print $2}')
  if [ "$w" != "$CW" ] || [ "$h" != "$CH" ]; then
    cp "$src" "$ORIG/$(basename "$src")"
    size=$(cover "$ORIG/$(basename "$src")" "$DISC/$base.jpg")
    echo "  $(basename "$src") cropped to ${CW}x${CH} ($(echo "$size" | awk '{printf "%dKB", $1/1024}'); original kept in originals/)"
    count=$((count + 1))
  fi
done
shopt -u nullglob nocaseglob

# Append stub entries for any card image not yet referenced in DISCOVERIES.
python3 - "$MAINJS" "$DISC" <<'EOF'
import re, sys, json, pathlib
mainjs, disc = sys.argv[1], pathlib.Path(sys.argv[2])
present = [p.name for p in sorted(disc.glob("*.jpg")) if p.name != "_placeholder.jpg"]

src = open(mainjs).read()
m = re.search(r"const DISCOVERIES = \[(.*?)\n  \];", src, flags=re.S)
assert m, "DISCOVERIES array not found in js/main.js"
body = m.group(1)

known = set(re.findall(r'image:\s*"([^"]+)"', body))
new = [f for f in present if f not in known]
if not new:
    print("DISCOVERIES already current — no new images.")
    sys.exit(0)

# Separate the trailing commented "ready to go live" block (kept verbatim).
lines = body.split("\n")
tail = []
while lines and (lines[-1].strip() == "" or lines[-1].strip().startswith("//")):
    tail.insert(0, lines.pop())
active = "\n".join(lines).rstrip().rstrip(",")

stub = lambda f: (
    '    { title: "New discovery — edit me",\n'
    '      blurb: "Describe this SAO discovery.",\n'
    f'      image: {json.dumps(f)}, credit: "" }}')
active += "".join(",\n" + stub(f) for f in new)

rebuilt = "const DISCOVERIES = [" + active + ("\n" + "\n".join(tail) if tail else "") + "\n  ];"
open(mainjs, "w").write(src[:m.start()] + rebuilt + src[m.end():])
print(f"Appended {len(new)} stub entry/entries (edit title/blurb in js/main.js): " + ", ".join(new))
EOF

node --check "$MAINJS" && echo "js/main.js syntax OK"

if [ "${1:-}" = "--push" ]; then
  cd "$REPO"
  git add assets/images/discoveries js/main.js
  git commit -m "Add SAO discovery card image(s)"
  git push
  echo "Pushed — live in ~1 minute."
else
  echo "Review locally, then commit & push to deploy (or re-run with --push)."
fi
