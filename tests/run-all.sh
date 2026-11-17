#!/bin/bash
# Всички тестове с една команда. Прави отделен build (.next-test) и за всеки пакет пуска
# отделен сървър с прясна база, така че работещото демо на порт 3210 не се пипа.
#
#   bash tests/run-all.sh              # всичко
#   SKIP_BUILD=1 bash tests/run-all.sh # без нов build
#
# Резултатите са в tests/shots/run/. Пакет, който падне, се пуска още до два пъти на чиста
# база: ако компютърът заспи по средата, тестовете падат с изтекло време, без да има грешка.
cd "$(dirname "$0")/.." || exit 1
OUT=tests/shots/run
rm -rf "$OUT"
mkdir -p "$OUT"
export NEXT_DIST_DIR=.next-test

if [ "${SKIP_BUILD:-}" != "1" ]; then
  echo "Build..."
  if ! npx next build > "$OUT/build.log" 2>&1; then
    echo "Build-ът падна, виж $OUT/build.log"
    exit 1
  fi
fi

stop() {
  local pid
  pid=$(lsof -ti "tcp:$1" -sTCP:LISTEN)
  [ -n "$pid" ] && kill $pid 2>/dev/null
  sleep 1
}

serve() { # порт папка-за-базата [ИМЕ=стойност ...]
  local port=$1 dir=$2
  shift 2
  stop "$port"
  rm -rf ".data/$dir"
  env PGLITE_DIR=".data/$dir" INSECURE_COOKIES=1 ALLOW_DEV_PEEK=1 "$@" npx next start -p "$port" > "$OUT/server-$port.log" 2>&1 &
  local i
  for i in $(seq 1 90); do
    curl -s -o /dev/null -m 5 "http://localhost:$port/api/health" && return 0
    sleep 1
  done
  return 1
}

suite() { # име порт папка-за-базата "команда" [ИМЕ=стойност ...]
  local name=$1 port=$2 dir=$3 cmd=$4 try
  shift 4
  for try in 1 2 3; do
    if ! serve "$port" "$dir" "$@"; then
      echo "сървърът на порт $port не тръгна" > "$OUT/$name.txt"
      continue
    fi
    if bash -c "$cmd" > "$OUT/$name.txt" 2>&1; then
      stop "$port"
      echo "ok    $name (опит $try): $(grep -E 'Готово|минали' "$OUT/$name.txt" | tail -2 | tr '\n' ' ')"
      return 0
    fi
    cp "$OUT/$name.txt" "$OUT/$name.opit$try.txt"
    stop "$port"
  done
  echo "FAIL  $name: $(grep -E 'Готово|минали' "$OUT/$name.txt" | tail -2 | tr '\n' ' ')"
  grep -E "^  (FAIL|паднал)" "$OUT/$name.txt" | head -12
  echo "$name" >> "$OUT/failed"
  return 1
}

suite admin 3211 pg-t-admin "ADMIN_URL=http://localhost:3211 node tests/admin.mjs" &
suite site 3213 pg-t-site "node tests/e2e.mjs http://localhost:3213 && node tests/cross.mjs http://localhost:3213" &
suite viber 3212 pg-t-viber "node tests/viber.mjs http://localhost:3212" VIBER_API_BASE=http://localhost:3999 VIBER_WEBHOOK_URL=https://example.org/hook &
suite access 3214 pg-t-access "node tests/deep-access.mjs http://localhost:3214" &
suite chat 3215 pg-t-chat "node tests/deep-chat.mjs http://localhost:3215" &
suite crawl 3216 pg-t-crawl "node tests/deep-crawl.mjs http://localhost:3216 chromium" &
wait

# Същото обхождане в WebKit (двигателят на Safari), ако е свален: npx playwright-core install webkit
if ls "$HOME/Library/Caches/ms-playwright" 2>/dev/null | grep -q '^webkit-'; then
  suite crawl-webkit 3216 pg-t-crawl "node tests/deep-crawl.mjs http://localhost:3216 webkit"
else
  echo "---   crawl-webkit: пропуснато, WebKit не е свален"
fi

if [ -f "$OUT/failed" ]; then
  echo "Има паднали пакети: $(tr '\n' ' ' < "$OUT/failed")"
  exit 1
fi
echo "Всичко мина."
