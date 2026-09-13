#!/usr/bin/env bash
# Milestone 2f e2e — HoA Roles (promote/demote, guards, audit) + Recent Actions page.
# Requires: postgres up, API (:3000) and web (:3100) running the CURRENT build.
set -u
B=${WEB_URL:-http://localhost:3100}
A=${API_URL:-http://localhost:3000}
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }

# 0) sessions: HoA (cookie + token), HoE + student cookies for guards
code=$(curl -s -c /tmp/e2f-hoa.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' -o /dev/null -w '%{http_code}')
chk "hoa-login" "$code" 200
TOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$TOK" ] && chk "api-token" ok ok || chk "api-token" missing ok
curl -s -c /tmp/e2f-hoe.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"head@akibatech.com","password":"a2sv-demo"}' -o /dev/null
curl -s -c /tmp/e2f-stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null

# 1) pages render for HoA; guarded (307) for HoE + student
for p in roles activities; do
  chk "hoa-page-$p" "$(curl -s -b /tmp/e2f-hoa.jar $B/$p -o /dev/null -w '%{http_code}')" 200
  chk "hoe-page-$p-307" "$(curl -s -b /tmp/e2f-hoe.jar $B/$p -o /dev/null -w '%{http_code}')" 307
  chk "stu-page-$p-307" "$(curl -s -b /tmp/e2f-stu.jar $B/$p -o /dev/null -w '%{http_code}')" 307
done

# 2) BFF write guards: student + HoE both 403 on role change + delete
STU=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/users | python3 -c "import json,sys;rows=[u for u in json.load(sys.stdin) if u.get('email')=='student@akibatech.com'];print(rows[0]['id'] if rows else '')")
ORIG_GID=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/users | python3 -c "import json,sys;rows=[u for u in json.load(sys.stdin) if u.get('email')=='student@akibatech.com'];print((rows[0].get('groupId') or '') if rows else '')")
[ -n "$STU" ] && chk "student-id" ok ok || chk "student-id" missing ok
chk "stu-role-403" "$(curl -s -b /tmp/e2f-stu.jar -X PATCH $B/api/admin/users/$STU/role -H 'Content-Type: application/json' -d '{"role":"head_of_education"}' -o /dev/null -w '%{http_code}')" 403
chk "hoe-role-403" "$(curl -s -b /tmp/e2f-hoe.jar -X PATCH $B/api/admin/users/$STU/role -H 'Content-Type: application/json' -d '{"role":"head_of_education"}' -o /dev/null -w '%{http_code}')" 403
chk "stu-del-403" "$(curl -s -b /tmp/e2f-stu.jar -X DELETE $B/api/admin/users/$STU -o /dev/null -w '%{http_code}')" 403

# 3) role round-trip via HoA BFF: promote -> verify -> demote back (preserves group)
code=$(curl -s -b /tmp/e2f-hoa.jar -X PATCH $B/api/admin/users/$STU/role -H 'Content-Type: application/json' -d "{\"role\":\"head_of_education\",\"groupId\":\"$ORIG_GID\"}" -o /dev/null -w '%{http_code}')
chk "promote-ok" "$code" 200
chk "promoted" "$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/users | python3 -c "import json,sys;print(next((u['role'] for u in json.load(sys.stdin) if u['id']=='$STU'), 'x'))")" head_of_education
code=$(curl -s -b /tmp/e2f-hoa.jar -X PATCH $B/api/admin/users/$STU/role -H 'Content-Type: application/json' -d "{\"role\":\"student\",\"groupId\":\"$ORIG_GID\"}" -o /dev/null -w '%{http_code}')
chk "demote-ok" "$code" 200
chk "demoted" "$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/users | python3 -c "import json,sys;print(next((u['role'] for u in json.load(sys.stdin) if u['id']=='$STU'), 'x'))")" student

# 4) removed-users list is empty for HoA (seed soft-deletes nothing)
chk "removed-empty" "$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/users/removed | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")" 0

# 5) audit invariant: role change is recorded in the Recent Actions feed
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/activities?limit=20" -o /tmp/e2f-act.json
chk "audit-role-change" "$(python3 -c "import json;acts=json.load(open('/tmp/e2f-act.json'));print(any(\"changed \" in a['description'] and \"'s role to\" in a['description'] for a in acts))")" True

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
