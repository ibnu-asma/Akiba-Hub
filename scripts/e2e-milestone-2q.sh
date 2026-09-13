#!/usr/bin/env bash
# Milestone 2q e2e — Contests (paginate, filter, search, edit, questions, soft-delete, guards).
# Requires: postgres up, API (:3000) and web (:3100) running the CURRENT build.
set -u
A=${API_URL:-http://localhost:3000}
B=${WEB_URL:-http://localhost:3100}
TS=$(date +%s)
DD=$(date -d "+$((TS % 30 + 60)) days" +%Y-%m-%d)
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }
pyid() { python3 -c "import json,sys;d=json.load(open('$1'));print(d.get('$2',''))" 2>/dev/null; }

curl -s -c /tmp/e2q-hoe.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"head@akibatech.com","password":"a2sv-demo"}' -o /dev/null
curl -s -c /tmp/e2q-stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null
TOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$TOK" ] && chk "token" ok ok || chk "token" missing ok
GRPID=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/groups | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['id'])")
[ -n "$GRPID" ] && chk "group" ok ok || chk "group" missing ok

mkproblem() { curl -s -b /tmp/e2q-hoe.jar -X POST $B/api/admin/problems -H 'Content-Type: application/json' -d "{\"name\":\"E2Q $1 $TS\",\"platform\":\"codeforces\",\"difficulty\":\"hard\",\"tags\":[\"E2Q\"],\"link\":\"https://codeforces.com/e2q-$1-$TS\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])"; }
PA=$(mkproblem A); PB=$(mkproblem B)
[ -n "$PA" ] && [ -n "$PB" ] && chk "problems" ok ok || chk "problems" missing ok

CNAME="E2Q Contest $TS"
CID=$(curl -s -b /tmp/e2q-hoe.jar -X POST $B/api/admin/contests -H 'Content-Type: application/json' -d "{\"name\":\"$CNAME\",\"number\":882,\"type\":\"standard\",\"unrated\":false,\"date\":\"$DD\",\"standingsLink\":\"https://standings.example/$TS\",\"groupIds\":[\"$GRPID\"]}" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
[ -n "$CID" ] && chk "create" ok ok || chk "create" missing ok

curl -s -b /tmp/e2q-hoe.jar -X POST $B/api/admin/contests/$CID/problems -H 'Content-Type: application/json' -d "{\"problemIds\":[\"$PA\",\"$PB\"]}" -o /tmp/e2q-attach.json
chk "attach-2" "$(pyid /tmp/e2q-attach.json added)" 2

curl -sm 5 -H "Authorization: Bearer $TOK" "$A/contests?limit=1&offset=0" -o /tmp/e2q-page.json
chk "paged-shape" "$(python3 -c "import json;d=json.load(open('/tmp/e2q-page.json'));print(isinstance(d, dict) and 'rows' in d and 'total' in d)")" True
chk "paged-len1" "$(python3 -c "import json;print(len(json.load(open('/tmp/e2q-page.json'))['rows']))")" 1
chk "paged-total" "$(python3 -c "import json;print(json.load(open('/tmp/e2q-page.json'))['total'] >= 1)")" True

QE=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote('$CNAME'))")
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/contests?q=$QE&limit=5" -o /tmp/e2q-search.json
chk "search-found" "$(python3 -c "import json;d=json.load(open('/tmp/e2q-search.json'));print(len(d['rows'])>=1 and d['rows'][0]['id']=='$CID')")" True
chk "search-groupnames" "$(python3 -c "import json;d=json.load(open('/tmp/e2q-search.json'));print(isinstance(d['rows'][0]['groupNames'], list) and len(d['rows'][0]['groupNames'])>=1)")" True
chk "search-problemcount" "$(python3 -c "import json;d=json.load(open('/tmp/e2q-search.json'));print(d['rows'][0]['problemCount']==2)")" True

curl -sm 5 -H "Authorization: Bearer $TOK" "$A/contests?type=super&limit=50" -o /tmp/e2q-super.json
chk "filter-super-excludes" "$(python3 -c "import json;d=json.load(open('/tmp/e2q-super.json'));print(all(r['id']!='$CID' for r in d['rows']))")" True

curl -sm 5 -H "Authorization: Bearer $TOK" $A/contests/$CID/problems -o /tmp/e2q-probs.json
chk "problems-2" "$(python3 -c "import json;print(len(json.load(open('/tmp/e2q-probs.json'))))")" 2
chk "problems-letters" "$(python3 -c "import json;print(sorted(p['pseudo'] for p in json.load(open('/tmp/e2q-probs.json'))))")" "['A', 'B']"

ENAME="E2Q Contest $TS Edited"
code=$(curl -s -b /tmp/e2q-hoe.jar -X PATCH $B/api/admin/contests/$CID -H 'Content-Type: application/json' -d "{\"name\":\"$ENAME\",\"number\":883,\"type\":\"super\",\"unrated\":true,\"date\":\"$DD\",\"standingsLink\":null,\"groupIds\":[\"$GRPID\"]}" -o /dev/null -w '%{http_code}')
chk "edit" "$code" 200

code=$(curl -s -b /tmp/e2q-hoe.jar -X DELETE $B/api/admin/contests/$CID/problems/$PA -o /dev/null -w '%{http_code}')
chk "remove-problem" "$code" 200
chk "problems-1" "$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/contests/$CID/problems | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")" 1

code=$(curl -s -b /tmp/e2q-hoe.jar -X DELETE $B/api/admin/contests/$CID -o /dev/null -w '%{http_code}')
chk "delete" "$code" 200
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/contests?limit=200" -o /tmp/e2q-final.json
chk "deleted-hide" "$(python3 -c "import json;d=json.load(open('/tmp/e2q-final.json'));rows=d['rows'] if isinstance(d, dict) else d;print(not any(r['id']=='$CID' for r in rows))")" True

chk "stu-create-403" "$(curl -s -b /tmp/e2q-stu.jar -X POST $B/api/admin/contests -H 'Content-Type: application/json' -d '{}' -o /dev/null -w '%{http_code}')" 403
chk "page-hoe" "$(curl -s -b /tmp/e2q-hoe.jar $B/contests/new -o /dev/null -w '%{http_code}')" 200
chk "page-stu-307" "$(curl -s -b /tmp/e2q-stu.jar $B/contests/new -o /dev/null -w '%{http_code}')" 307

curl -s -b /tmp/e2q-hoe.jar -X DELETE $B/api/admin/problems/$PB -o /dev/null
curl -s -b /tmp/e2q-hoe.jar -X DELETE $B/api/admin/problems/$PA -o /dev/null

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
