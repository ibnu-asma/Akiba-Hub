#!/usr/bin/env bash
# Milestone 2l e2e — Group management (create, list, assign/remove students, assign heads, delete).
# Requires: postgres up, API (:3000) and web (:3100) running the CURRENT build.
set -u
A=${API_URL:-http://localhost:3000}
B=${WEB_URL:-http://localhost:3100}
TS=$(date +%s)
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }
pyid() { python3 -c "import json,sys;d=json.load(open('$1'));print(d.get('$2',''))" 2>/dev/null; }

# 0) HoA token + cookie
TOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$TOK" ] && chk "token" ok ok || chk "token" missing ok
curl -s -c /tmp/e2l-hoa.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' -o /dev/null

# student + supergroup ids
STU=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/users | python3 -c "import json,sys;rows=[u for u in json.load(sys.stdin) if u.get('email')=='student@akibatech.com'];print(rows[0]['id'] if rows else '')")
ORIG_GID=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/users | python3 -c "import json,sys;rows=[u for u in json.load(sys.stdin) if u.get('email')=='student@akibatech.com'];print((rows[0].get('groupId') or '') if rows else '')")
SG=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/super-groups | python3 -c "import json,sys;d=json.load(sys.stdin);print(d[0]['id'] if d else '')")
[ -n "$STU" ] && chk "student-id" ok ok || chk "student-id" missing ok

# 1) list shape (students + superGroupName)
curl -sm 5 -H "Authorization: Bearer $TOK" $A/groups -o /tmp/e2l-list.json
chk "list-shape" "$(python3 -c "import json;g=json.load(open('/tmp/e2l-list.json'))[0];print('students' in g and 'superGroupName' in g)")" True

# 2) create group via BFF
GNAME="E2L Group $TS"
code=$(curl -s -b /tmp/e2l-hoa.jar -X POST $B/api/admin/groups -H 'Content-Type: application/json' -d "{\"name\":\"$GNAME\",\"shortName\":\"E2L$TS\",\"country\":\"Ethiopia\",\"superGroupId\":\"$SG\"}" -o /tmp/e2l-group.json -w '%{http_code}')
case "$code" in 200|201) chk "group-create" ok ok ;; *) chk "group-create" "$code" 2xx ;; esac
GID=$(pyid /tmp/e2l-group.json id)
[ -n "$GID" ] && chk "group-id" ok ok || chk "group-id" missing ok

# 3) assign student
code=$(curl -s -b /tmp/e2l-hoa.jar -X POST $B/api/admin/groups/$GID/students -H 'Content-Type: application/json' -d "{\"userIds\":[\"$STU\"]}" -o /tmp/e2l-assign.json -w '%{http_code}')
case "$code" in 200|201) chk "assign-student" ok ok ;; *) chk "assign-student" "$code" 2xx ;; esac
curl -sm 5 -H "Authorization: Bearer $TOK" $A/groups -o /tmp/e2l-after.json
chk "student-in-group" "$(python3 -c "import json;rows=json.load(open('/tmp/e2l-after.json'));g=next(g for g in rows if g['id']=='$GID');print(any(s['id']=='$STU' for s in g['students']))")" True

# 4) remove student
code=$(curl -s -b /tmp/e2l-hoa.jar -X DELETE $B/api/admin/groups/$GID/students/$STU -o /dev/null -w '%{http_code}')
chk "remove-student" "$code" 200
curl -sm 5 -H "Authorization: Bearer $TOK" $A/groups -o /tmp/e2l-rem.json
chk "student-removed" "$(python3 -c "import json;rows=json.load(open('/tmp/e2l-rem.json'));g=next(g for g in rows if g['id']=='$GID');print(not any(s['id']=='$STU' for s in g['students']))")" True

# 5) assign heads
HOE=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/users | python3 -c "import json,sys;rows=[u for u in json.load(sys.stdin) if u.get('email')=='head@akibatech.com'];print(rows[0]['id'] if rows else '')")
code=$(curl -s -b /tmp/e2l-hoa.jar -X POST $B/api/admin/groups/$GID/heads -H 'Content-Type: application/json' -d "{\"headUserIds\":[\"$HOE\"]}" -o /dev/null -w '%{http_code}')
case "$code" in 200|201) chk "assign-heads" ok ok ;; *) chk "assign-heads" "$code" 2xx ;; esac

# 5b) edit group details (PATCH)
code=$(curl -s -b /tmp/e2l-hoa.jar -X PATCH $B/api/admin/groups/$GID -H 'Content-Type: application/json' -d "{\"name\":\"$GNAME Edited\",\"shortName\":\"E2L${TS}E\",\"superGroupId\":\"$SG\"}" -o /dev/null -w '%{http_code}')
chk "edit-group" "$code" 200

# 6) delete group
code=$(curl -s -b /tmp/e2l-hoa.jar -X DELETE $B/api/admin/groups/$GID -o /dev/null -w '%{http_code}')
chk "delete-group" "$code" 200
curl -sm 5 -H "Authorization: Bearer $TOK" $A/groups -o /tmp/e2l-final.json
chk "group-deleted" "$(python3 -c "import json;rows=json.load(open('/tmp/e2l-final.json'));print(not any(g['id']=='$GID' for g in rows))")" True

# 7) web page renders (HoA 200, student 307)
curl -s -c /tmp/e2l-stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null
chk "page-hoa" "$(curl -s -b /tmp/e2l-hoa.jar $B/groups/new -o /dev/null -w '%{http_code}')" 200
chk "page-stu-307" "$(curl -s -b /tmp/e2l-stu.jar $B/groups/new -o /dev/null -w '%{http_code}')" 307

# restore the seed student's original group (keep the test non-destructive)
if [ -n "$ORIG_GID" ]; then
  curl -sm 5 -H "Authorization: Bearer $TOK" -X PATCH $A/users/$STU/role -H 'Content-Type: application/json' -d "{\"role\":\"student\",\"groupId\":\"$ORIG_GID\"}" -o /dev/null
fi

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
