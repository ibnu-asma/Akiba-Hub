#!/usr/bin/env bash
# Milestone 2g e2e — Submissions (manual + extension solves, role-scoped feed, guards).
# Requires: postgres up, API (:3000) and web (:3100) running the CURRENT build.
set -u
B=${WEB_URL:-http://localhost:3100}
A=${API_URL:-http://localhost:3000}
TS=$(date +%s)
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }
pyid() { python3 -c "import json,sys;d=json.load(open('$1'));print(d.get('$2',''))" 2>/dev/null; }

# 0) tokens + cookies (student / HoE / HoA)
ADMINTOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
HOETOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"head@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
STUTOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
curl -s -c /tmp/e2g-stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null
curl -s -c /tmp/e2g-hoe.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"head@akibatech.com","password":"a2sv-demo"}' -o /dev/null
[ -n "$ADMINTOK" ] && [ -n "$STUTOK" ] && chk "tokens" ok ok || chk "tokens" missing ok

STU=$(curl -sm 5 -H "Authorization: Bearer $ADMINTOK" $A/users | python3 -c "import json,sys;rows=[u for u in json.load(sys.stdin) if u.get('email')=='student@akibatech.com'];print(rows[0]['id'] if rows else '')")

# 1) seed a problem (HoE via BFF)
PID=$(curl -s -b /tmp/e2g-hoe.jar -X POST $B/api/admin/problems -H 'Content-Type: application/json' -d "{\"name\":\"E2G Problem $TS\",\"platform\":\"codeforces\",\"difficulty\":\"medium\",\"tags\":[\"E2E\"],\"link\":\"https://codeforces.com/e2g-$TS\"}" | python3 -c "import json,sys;print(json.load(sys.stdin).get('id',''))")
[ -n "$PID" ] && chk "problem-seeded" ok ok || chk "problem-seeded" missing ok

# 2) student submits manually via BFF
code=$(curl -s -b /tmp/e2g-stu.jar -X POST $B/api/submissions -H 'Content-Type: application/json' -d "{\"problemId\":\"$PID\",\"language\":\"Python\",\"timeSpentMin\":25,\"tries\":2}" -o /tmp/e2g-sub.json -w '%{http_code}')
case "$code" in 200|201) chk "submit-manual" ok ok ;; *) chk "submit-manual" "$code" 2xx ;; esac
SID=$(pyid /tmp/e2g-sub.json id)
[ -n "$SID" ] && chk "submission-id" ok ok || chk "submission-id" missing ok

# 3) student feed: own submissions only + joined names
curl -sm 5 -H "Authorization: Bearer $STUTOK" "$A/submissions?limit=50" -o /tmp/e2g-stufeed.json
chk "stu-feed-own-only" "$(python3 -c "import json;rows=json.load(open('/tmp/e2g-stufeed.json'));print(all(r['userId']=='$STU' for r in rows))")" True
chk "stu-feed-joined" "$(python3 -c "import json;rows=json.load(open('/tmp/e2g-stufeed.json'));r=next(r for r in rows if r['id']=='$SID');print(r['problemName'].startswith('E2G') and r['userName']=='Geleta Daba')")" True

# 4) HoA feed: platform-wide, includes it
curl -sm 5 -H "Authorization: Bearer $ADMINTOK" "$A/submissions?limit=100" -o /tmp/e2g-hoafeed.json
chk "hoa-feed-all" "$(python3 -c "import json;rows=json.load(open('/tmp/e2g-hoafeed.json'));print(any(r['id']=='$SID' for r in rows))")" True

# 5) HoE feed: group-wide, includes it (student is in G5A which HoE heads)
curl -sm 5 -H "Authorization: Bearer $HOETOK" "$A/submissions?limit=100" -o /tmp/e2g-hoefeed.json
chk "hoe-feed-group" "$(python3 -c "import json;rows=json.load(open('/tmp/e2g-hoefeed.json'));print(any(r['id']=='$SID' for r in rows))")" True

# 6) extension-source solve
code=$(curl -s -b /tmp/e2g-stu.jar -X POST $B/api/submissions -H 'Content-Type: application/json' -d "{\"problemId\":\"$PID\",\"language\":\"C++\",\"timeSpentMin\":10,\"tries\":1,\"source\":\"extension\"}" -o /tmp/e2g-sub2.json -w '%{http_code}')
chk "submit-extension-source" "$(pyid /tmp/e2g-sub2.json source)" extension

# 7) validation + auth guards
chk "submit-bad-400" "$(curl -s -b /tmp/e2g-stu.jar -X POST $B/api/submissions -H 'Content-Type: application/json' -d '{}' -o /dev/null -w '%{http_code}')" 400
chk "feed-unauth-401" "$(curl -sm 5 $A/submissions -o /dev/null -w '%{http_code}')" 401

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
