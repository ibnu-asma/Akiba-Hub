#!/usr/bin/env bash
# Milestone 2d e2e — contests (schedule + questions) and daily problems.
# Requires: postgres up, API (:3000) and web (:3100) running the CURRENT build.
set -u
B=${WEB_URL:-http://localhost:3100}
A=${API_URL:-http://localhost:3000}
TS=$(date +%s)
# Unique future date per run — dodges the daily-problems unique (sg, date) index.
DD=$(date -d "+$((TS % 30 + 30)) days" +%Y-%m-%d)
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }
pyid() { python3 -c "import json,sys;d=json.load(open('$1'));print(d.get('$2',''))" 2>/dev/null; }

# 0) sessions: HoE via BFF (cookie) + HoA direct API (token for direct reads)
code=$(curl -s -c /tmp/e2d-hoe.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"head@akibatech.com","password":"a2sv-demo"}' -o /dev/null -w '%{http_code}')
chk "hoe-login" "$code" 200
TOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$TOK" ] && chk "api-token" ok ok || chk "api-token" missing ok
SGID=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/super-groups | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['id'])")
GRPID=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/groups | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['id'])")
[ -n "$SGID" ] && [ -n "$GRPID" ] && chk "ids" ok ok || chk "ids" missing ok

# 1) pages render for HoE, guarded for student
for p in contests/new daily-problem; do
  chk "hoe-page-$p" "$(curl -s -b /tmp/e2d-hoe.jar $B/$p -o /dev/null -w '%{http_code}')" 200
done
curl -s -c /tmp/e2d-stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null
chk "stu-page-guard" "$(curl -s -b /tmp/e2d-stu.jar $B/contests/new -o /dev/null -w '%{http_code}')" 307
chk "stu-contest-403" "$(curl -s -b /tmp/e2d-stu.jar -X POST $B/api/admin/contests -H 'Content-Type: application/json' -d '{}' -o /dev/null -w '%{http_code}')" 403
chk "stu-daily-403" "$(curl -s -b /tmp/e2d-stu.jar -X POST $B/api/admin/daily-problems -H 'Content-Type: application/json' -d '{}' -o /dev/null -w '%{http_code}')" 403

# 2) seed two problems through the BFF (contest questions + daily challenge)
mkproblem() {
  curl -s -b /tmp/e2d-hoe.jar -X POST $B/api/admin/problems -H 'Content-Type: application/json' \
    -d "{\"name\":\"$1\",\"platform\":\"codeforces\",\"difficulty\":\"medium\",\"tags\":[\"E2E\"],\"link\":\"https://codeforces.com/e2d-$2\"}"
}
P1=$(mkproblem "E2D Problem A $TS" "a-$TS"); PA=$(echo "$P1" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
P2=$(mkproblem "E2D Problem B $TS" "b-$TS"); PB=$(echo "$P2" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
[ -n "$PA" ] && [ -n "$PB" ] && chk "problems-seeded" ok ok || chk "problems-seeded" missing ok

# 3) create the contest via BFF (HoE)
CNAME="E2D Contest $TS"
code=$(curl -s -b /tmp/e2d-hoe.jar -X POST $B/api/admin/contests -H 'Content-Type: application/json' \
  -d "{\"name\":\"$CNAME\",\"number\":991,\"type\":\"standard\",\"unrated\":false,\"date\":\"$DD\",\"groupIds\":[\"$GRPID\"]}" -o /tmp/e2d-contest.json -w '%{http_code}')
case "$code" in 200|201) chk "contest-create" ok ok ;; *) chk "contest-create" "$code" 2xx ;; esac
CID=$(pyid /tmp/e2d-contest.json id)
[ -n "$CID" ] && chk "contest-id" ok ok || chk "contest-id" missing ok

# 4) attach questions — pseudo letters A/B; idempotent re-attach adds 0
curl -s -b /tmp/e2d-hoe.jar -X POST $B/api/admin/contests/$CID/problems -H 'Content-Type: application/json' -d "{\"problemIds\":[\"$PA\",\"$PB\"]}" -o /tmp/e2d-attach.json
chk "questions-added-2" "$(pyid /tmp/e2d-attach.json added)" 2
curl -s -b /tmp/e2d-hoe.jar -X POST $B/api/admin/contests/$CID/problems -H 'Content-Type: application/json' -d "{\"problemIds\":[\"$PA\"]}" -o /tmp/e2d-attach2.json
chk "questions-dup-0" "$(pyid /tmp/e2d-attach2.json added)" 0

# 5) contest feed is newest-first and contains it
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/contests?limit=50" -o /tmp/e2d-feed.json
chk "contest-newest-first" "$(python3 -c "import json;print(json.load(open('/tmp/e2d-feed.json'))[0]['name'])")" "$CNAME"

# 6) daily problem: create, duplicate -> friendly 400, feed newest-first with join
code=$(curl -s -b /tmp/e2d-hoe.jar -X POST $B/api/admin/daily-problems -H 'Content-Type: application/json' \
  -d "{\"superGroupId\":\"$SGID\",\"problemId\":\"$PA\",\"date\":\"$DD\"}" -o /tmp/e2d-daily.json -w '%{http_code}')
case "$code" in 200|201) chk "daily-create" ok ok ;; *) chk "daily-create" "$code" 2xx ;; esac
DID=$(pyid /tmp/e2d-daily.json id)
if [ -z "$DID" ]; then
  DID=$(curl -sm 5 -H "Authorization: Bearer $TOK" "$A/daily-problems?limit=50" | python3 -c "import json,sys;rows=json.load(sys.stdin);print(next((r['id'] for r in rows if r['problemId']=='$PA'), ''))")
fi
[ -n "$DID" ] && chk "daily-id" ok ok || chk "daily-id" missing ok
code=$(curl -s -b /tmp/e2d-hoe.jar -X POST $B/api/admin/daily-problems -H 'Content-Type: application/json' \
  -d "{\"superGroupId\":\"$SGID\",\"problemId\":\"$PB\",\"date\":\"$DD\"}" -o /tmp/e2d-dup.json -w '%{http_code}')
chk "daily-dup-400" "$code" 400
grep -q 'already assigned for that date' /tmp/e2d-dup.json && chk "daily-dup-message" ok ok || chk "daily-dup-message" missing ok
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/daily-problems?limit=50" -o /tmp/e2d-dfeed.json
chk "daily-joined" "$(python3 -c "import json;rows=json.load(open('/tmp/e2d-dfeed.json'));print(any(r['problemName'].startswith('E2D') for r in rows))")" True

# 7) audit trail: contest create + questions attach + daily assignment
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/activities?limit=20" -o /tmp/e2d-act.json
chk "audit-contest" "$(python3 -c "import json;acts=json.load(open('/tmp/e2d-act.json'));print(any(\"created the contest called '$CNAME'\" in a['description'] for a in acts))")" True
chk "audit-questions" "$(python3 -c "import json;acts=json.load(open('/tmp/e2d-act.json'));print(any(\"attached 2 exercises to contest '$CNAME'\" in a['description'] for a in acts))")" True
chk "audit-daily" "$(python3 -c "import json;acts=json.load(open('/tmp/e2d-act.json'));print(any('assigned a daily problem for $DD' in a['description'] for a in acts))")" True

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]