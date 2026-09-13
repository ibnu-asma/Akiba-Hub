#!/usr/bin/env bash
# Milestone 2r e2e — Exercises (cross-track list, add, filter, search, pagination, reassign, remove, guards).
# Requires: postgres up, API (:3000) and web (:3100) running the CURRENT build.
set -u
A=${API_URL:-http://localhost:3000}
B=${WEB_URL:-http://localhost:3100}
TS=$(date +%s)
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }
pyid() { python3 -c "import json,sys;d=json.load(open('$1'));print(d.get('$2',''))" 2>/dev/null; }

curl -s -c /tmp/e2r-hoe.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"head@akibatech.com","password":"a2sv-demo"}' -o /dev/null
curl -s -c /tmp/e2r-stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null
curl -s -c /tmp/e2r-adm.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' -o /dev/null
TOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$TOK" ] && chk "token" ok ok || chk "token" missing ok
JAR=/tmp/e2r-adm.jar

SG=$(curl -s -b $JAR -X POST $B/api/admin/super-groups -H 'Content-Type: application/json' -d "{\"name\":\"E2R SG $TS\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
[ -n "$SG" ] && chk "sg" ok ok || chk "sg" missing ok

mktrack() { curl -s -b $JAR -X POST $B/api/admin/tracks -H 'Content-Type: application/json' -d "{\"superGroupId\":\"$SG\",\"phase\":\"$1\",\"name\":\"E2R Track $2 $TS\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])"; }
TA=$(mktrack PYTHON A); TB=$(mktrack PHASE_I B)
[ -n "$TA" ] && [ -n "$TB" ] && chk "tracks" ok ok || chk "tracks" missing ok

mkproblem() { curl -s -b $JAR -X POST $B/api/admin/problems -H 'Content-Type: application/json' -d "{\"name\":\"E2R $1 $TS\",\"platform\":\"leetcode\",\"difficulty\":\"$2\",\"tags\":[\"E2R\"],\"link\":\"https://leetcode.com/e2r-$1-$TS\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])"; }
PA=$(mkproblem Alpha easy); PB=$(mkproblem Beta hard)
[ -n "$PA" ] && [ -n "$PB" ] && chk "problems" ok ok || chk "problems" missing ok

# attach both to A
curl -s -b $JAR -X POST $B/api/admin/tracks/$TA/problems -H 'Content-Type: application/json' -d "{\"problemIds\":[\"$PA\",\"$PB\"]}" -o /tmp/e2r-add.json
chk "add-2" "$(pyid /tmp/e2r-add.json added)" 2

# 1) cross-track list contains both with track/supergroup enrichment
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/tracks/exercises?limit=50&superGroupId=$SG" -o /tmp/e2r-list.json
chk "list-2" "$(python3 -c "import json;rows=json.load(open('/tmp/e2r-list.json'))['rows'];print(len([r for r in rows if r['superGroupId']=='$SG']))")" 2
chk "list-enrich" "$(python3 -c "import json;d=json.load(open('/tmp/e2r-list.json'));r=d['rows'][0];print(r['trackName']!='' and r['superGroupName']!='' and r['phase']!='')")" True

# 2) paginated shape
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/tracks/exercises?limit=1&offset=0" -o /tmp/e2r-page.json
chk "paged-shape" "$(python3 -c "import json;d=json.load(open('/tmp/e2r-page.json'));print('rows' in d and 'total' in d and len(d['rows'])==1)")" True

# 3) search by problem name
QE=$(python3 -c "import urllib.parse;print(urllib.parse.quote('E2R Alpha $TS'))")
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/tracks/exercises?q=$QE&limit=10" -o /tmp/e2r-search.json
chk "search-1" "$(python3 -c "import json;rows=json.load(open('/tmp/e2r-search.json'))['rows'];print(len(rows)==1 and rows[0]['problemId']=='$PA')")" True

# 4) filter by track
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/tracks/exercises?trackId=$TA&limit=10" -o /tmp/e2r-track.json
chk "track-filter-2" "$(python3 -c "import json;rows=json.load(open('/tmp/e2r-track.json'))['rows'];print(len(rows))")" 2
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/tracks/exercises?trackId=$TB&limit=10" -o /tmp/e2r-trackb.json
chk "track-filter-b-0" "$(python3 -c "import json;print(len(json.load(open('/tmp/e2r-trackb.json'))['rows']))")" 0

# 5) reassign PA from A to B
curl -s -b $JAR -X POST $B/api/admin/tracks/$TA/reassign -H 'Content-Type: application/json' -d "{\"problemIds\":[\"$PA\"],\"targetTrackId\":\"$TB\"}" -o /tmp/e2r-reas.json
chk "reassign-1" "$(pyid /tmp/e2r-reas.json moved)" 1
chk "after-reassign-A-1" "$(curl -sm 5 -H "Authorization: Bearer $TOK" "$A/tracks/exercises?trackId=$TA&limit=10" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['rows']))")" 1
chk "after-reassign-B-1" "$(curl -sm 5 -H "Authorization: Bearer $TOK" "$A/tracks/exercises?trackId=$TB&limit=10" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['rows']))")" 1

# 6) remove PB from A
code=$(curl -s -b $JAR -X DELETE $B/api/admin/tracks/$TA/problems/$PB -o /dev/null -w '%{http_code}')
chk "remove" "$code" 200
chk "after-remove-A-0" "$(curl -sm 5 -H "Authorization: Bearer $TOK" "$A/tracks/exercises?trackId=$TA&limit=10" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['rows']))")" 0

# 7) guards + page
chk "stu-add-403" "$(curl -s -b /tmp/e2r-stu.jar -X POST $B/api/admin/tracks/$TB/problems -H 'Content-Type: application/json' -d '{}' -o /dev/null -w '%{http_code}')" 403
chk "page-hoe" "$(curl -s -b /tmp/e2r-hoe.jar $B/exercises/new -o /dev/null -w '%{http_code}')" 200
chk "page-stu-307" "$(curl -s -b /tmp/e2r-stu.jar $B/exercises/new -o /dev/null -w '%{http_code}')" 307

# cleanup
curl -s -b $JAR -X DELETE $B/api/admin/tracks/$TB -o /dev/null
curl -s -b $JAR -X DELETE $B/api/admin/tracks/$TA -o /dev/null
curl -s -b $JAR -X DELETE $B/api/admin/super-groups/$SG -o /dev/null
curl -s -b $JAR -X DELETE $B/api/admin/problems/$PA -o /dev/null
curl -s -b $JAR -X DELETE $B/api/admin/problems/$PB -o /dev/null

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
