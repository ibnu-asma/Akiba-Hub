#!/usr/bin/env bash
# Milestone 2o e2e — Problems (list, filter, paginate, edit, delete, guards).
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
curl -s -c /tmp/e2o-hoe.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"head@akibatech.com","password":"a2sv-demo"}' -o /dev/null
curl -s -c /tmp/e2o-stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null

PNAME="E2O Problem $TS"
TAG="E2O$TS"

# 1) create via BFF
code=$(curl -s -b /tmp/e2o-hoe.jar -X POST $B/api/admin/problems -H 'Content-Type: application/json' -d "{\"name\":\"$PNAME\",\"platform\":\"codeforces\",\"difficulty\":\"medium\",\"tags\":[\"$TAG\"],\"link\":\"https://codeforces.com/e2o-$TS\"}" -o /tmp/e2o-p.json -w '%{http_code}')
case "$code" in 200|201) chk "create" ok ok ;; *) chk "create" "$code" 2xx ;; esac
PID=$(pyid /tmp/e2o-p.json id)
[ -n "$PID" ] && chk "id" ok ok || chk "id" missing ok

# 2) pagination shape
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/problems?limit=1&offset=0" -o /tmp/e2o-list.json
chk "paginated" "$(python3 -c "import json;d=json.load(open('/tmp/e2o-list.json'));print('rows' in d and 'total' in d)")" True

# 3) filter difficulty
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/problems?difficulty=medium&offset=0&limit=100" -o /tmp/e2o-diff.json
chk "filter-difficulty" "$(python3 -c "import json;d=json.load(open('/tmp/e2o-diff.json'));print(all(r['difficulty']=='medium' for r in d['rows']))")" True

# 4) filter tag
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/problems?tag=$TAG&offset=0&limit=100" -o /tmp/e2o-tag.json
chk "filter-tag" "$(python3 -c "import json;d=json.load(open('/tmp/e2o-tag.json'));print(any(r['id']=='$PID' for r in d['rows']))")" True

# 5) search
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/problems?q=$TS&offset=0&limit=100" -o /tmp/e2o-q.json
chk "search" "$(python3 -c "import json;d=json.load(open('/tmp/e2o-q.json'));print(any(r['id']=='$PID' for r in d['rows']))")" True

# 6) edit (PATCH)
code=$(curl -s -b /tmp/e2o-hoe.jar -X PATCH $B/api/admin/problems/$PID -H 'Content-Type: application/json' -d "{\"name\":\"$PNAME Edited\",\"platform\":\"leetcode\",\"difficulty\":\"hard\",\"tags\":[\"$TAG\"],\"link\":\"https://leetcode.com/e2o-$TS\"}" -o /tmp/e2o-edit.json -w '%{http_code}')
chk "edit" "$code" 200
chk "edit-name" "$(pyid /tmp/e2o-edit.json name)" "$PNAME Edited"

# 7) delete (soft)
code=$(curl -s -b /tmp/e2o-hoe.jar -X DELETE $B/api/admin/problems/$PID -o /dev/null -w '%{http_code}')
chk "delete" "$code" 200
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/problems?limit=200" -o /tmp/e2o-after.json
chk "deleted-hide" "$(python3 -c "import json;print(not any(r['id']=='$PID' for r in json.load(open('/tmp/e2o-after.json'))))")" True

# 8) guards: student write 403, page renders
chk "stu-create-403" "$(curl -s -b /tmp/e2o-stu.jar -X POST $B/api/admin/problems -H 'Content-Type: application/json' -d '{}' -o /dev/null -w '%{http_code}')" 403
chk "page-hoe" "$(curl -s -b /tmp/e2o-hoe.jar $B/problems/new -o /dev/null -w '%{http_code}')" 200
chk "page-stu-307" "$(curl -s -b /tmp/e2o-stu.jar $B/problems/new -o /dev/null -w '%{http_code}')" 307

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
