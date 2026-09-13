#!/usr/bin/env bash
# Milestone 2p e2e — Tracks (create, edit, add/remove problems, reassign, soft-delete, guards).
# Requires: postgres up, API (:3000) and web (:3100) running the CURRENT build.
set -u
A=${API_URL:-http://localhost:3000}
B=${WEB_URL:-http://localhost:3100}
TS=$(date +%s)
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }
pyid() { python3 -c "import json,sys;d=json.load(open('$1'));print(d.get('$2',''))" 2>/dev/null; }

TOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$TOK" ] && chk "token" ok ok || chk "token" missing ok
curl -s -c /tmp/e2p-hoe.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"head@akibatech.com","password":"a2sv-demo"}' -o /dev/null
curl -s -c /tmp/e2p-stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null
# super-groups are HoA-only, so do all writes via admin
curl -s -c /tmp/e2p-adm.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' -o /dev/null
JAR=/tmp/e2p-adm.jar

# own super group (seed "Remote" already has all 5 phases)
SG=$(curl -s -b $JAR -X POST $B/api/admin/super-groups -H 'Content-Type: application/json' -d "{\"name\":\"E2P SG $TS\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
[ -n "$SG" ] && chk "sg" ok ok || chk "sg" missing ok

# two problems
mkproblem() { curl -s -b $JAR -X POST $B/api/admin/problems -H 'Content-Type: application/json' -d "{\"name\":\"E2P $1 $TS\",\"platform\":\"codeforces\",\"difficulty\":\"easy\",\"tags\":[\"E2P\"],\"link\":\"https://codeforces.com/e2p-$1-$TS\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])"; }
P1=$(mkproblem A); P2=$(mkproblem B)
[ -n "$P1" ] && [ -n "$P2" ] && chk "problems" ok ok || chk "problems" missing ok

# two tracks (distinct phases)
mktrack() { curl -s -b $JAR -X POST $B/api/admin/tracks -H 'Content-Type: application/json' -d "{\"superGroupId\":\"$SG\",\"phase\":\"$1\",\"name\":\"E2P Track $2 $TS\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])"; }
TA=$(mktrack PYTHON A); TB=$(mktrack PHASE_I B)
[ -n "$TA" ] && [ -n "$TB" ] && chk "tracks" ok ok || chk "tracks" missing ok

# 1) list includes both
curl -sm 5 -H "Authorization: Bearer $TOK" $A/tracks -o /tmp/e2p-list.json
chk "list-2" "$(python3 -c "import json;rows=json.load(open('/tmp/e2p-list.json'));print(all(any(t['id'] in ('$TA','$TB') for t in rows) for _ in (1,)) and any(t['id']=='$TA' for t in rows) and any(t['id']=='$TB' for t in rows))")" True

# 2) add problems to A
curl -s -b $JAR -X POST $B/api/admin/tracks/$TA/problems -H 'Content-Type: application/json' -d "{\"problemIds\":[\"$P1\",\"$P2\"]}" -o /tmp/e2p-add.json
chk "add-2" "$(pyid /tmp/e2p-add.json added)" 2

# 3) reassign P1 from A -> B
curl -s -b $JAR -X POST $B/api/admin/tracks/$TA/reassign -H 'Content-Type: application/json' -d "{\"problemIds\":[\"$P1\"],\"targetTrackId\":\"$TB\"}" -o /tmp/e2p-reas.json
chk "reassign-1" "$(pyid /tmp/e2p-reas.json moved)" 1
chk "A-problems-1" "$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/tracks/$TA/problems | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")" 1
chk "B-problems-1" "$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/tracks/$TB/problems | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")" 1

# 4) remove remaining problem from A
code=$(curl -s -b $JAR -X DELETE $B/api/admin/tracks/$TA/problems/$P2 -o /dev/null -w '%{http_code}')
chk "remove-problem" "$code" 200
chk "A-problems-0" "$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/tracks/$TA/problems | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")" 0

# 5) edit A
code=$(curl -s -b $JAR -X PATCH $B/api/admin/tracks/$TA -H 'Content-Type: application/json' -d "{\"superGroupId\":\"$SG\",\"phase\":\"PYTHON\",\"name\":\"E2P Track A $TS Edited\"}" -o /dev/null -w '%{http_code}')
chk "edit" "$code" 200

# 6) soft-delete A
code=$(curl -s -b $JAR -X DELETE $B/api/admin/tracks/$TA -o /dev/null -w '%{http_code}')
chk "delete" "$code" 200
curl -sm 5 -H "Authorization: Bearer $TOK" $A/tracks -o /tmp/e2p-final.json
chk "deleted-hide" "$(python3 -c "import json;print(not any(t['id']=='$TA' for t in json.load(open('/tmp/e2p-final.json'))))")" True

# 7) guards + page
chk "stu-create-403" "$(curl -s -b /tmp/e2p-stu.jar -X POST $B/api/admin/tracks -H 'Content-Type: application/json' -d '{}' -o /dev/null -w '%{http_code}')" 403
chk "page-hoe" "$(curl -s -b /tmp/e2p-hoe.jar $B/tracks/new -o /dev/null -w '%{http_code}')" 200
chk "page-stu-307" "$(curl -s -b /tmp/e2p-stu.jar $B/tracks/new -o /dev/null -w '%{http_code}')" 307

# cleanup — remove test data (non-destructive to seed)
curl -s -b $JAR -X DELETE $B/api/admin/tracks/$TB -o /dev/null
curl -s -b $JAR -X DELETE $B/api/admin/super-groups/$SG -o /dev/null
curl -s -b $JAR -X DELETE $B/api/admin/problems/$P1 -o /dev/null
curl -s -b $JAR -X DELETE $B/api/admin/problems/$P2 -o /dev/null

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
