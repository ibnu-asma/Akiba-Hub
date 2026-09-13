#!/usr/bin/env bash
# HoE slice E2E — Add Session + Take Attendance (SPEC §7.3–7.4).
# Requires web (:3100), api (:3000), Postgres, seed (G5A has 2 students).
set -u
B=${WEB_URL:-http://localhost:3100}
A=${API_URL:-http://localhost:3000}
TAG=$(date +%s)
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }

ADMIN=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c 'import json,sys;print(json.load(sys.stdin)["accessToken"])')
GID=$(curl -sm 5 $A/groups -H "Authorization: Bearer $ADMIN" | python3 -c 'import json,sys; print(next(g["id"] for g in json.load(sys.stdin) if g["name"]=="Remote Group 5A"))')

# HoE session
curl -s -c /tmp/hoe.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"head@akibatech.com","password":"a2sv-demo"}' -o /dev/null

# 1) Pages render for HoE
chk "attendance-page" "$(curl -s -b /tmp/hoe.jar $B/attendance -o /dev/null -w '%{http_code}')" 200
chk "sessions-new-page" "$(curl -s -b /tmp/hoe.jar $B/sessions/new -o /dev/null -w '%{http_code}')" 200

# 2) Create session via BFF (linked to G5A)
SNAME="Review Session $TAG"
SESSION=$(curl -s -b /tmp/hoe.jar -X POST $B/api/admin/sessions -H 'Content-Type: application/json' -d "{\"name\":\"$SNAME\",\"date\":\"2026-09-14\",\"startTime\":\"10:00\",\"endTime\":\"11:00\",\"location\":\"A2SV Hub\",\"groupIds\":[\"$GID\"]}")
SID=$(echo "$SESSION" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' 2>/dev/null || echo '')
[ ${#SID} -eq 36 ] && chk "session-create" "36" "36" || chk "session-create" "${SESSION:0:80}" "36-char-uuid"

# 3) Roster via BFF
ROSTER=$(curl -s -b /tmp/hoe.jar "$B/api/admin/sessions/$SID/attendance?groupId=$GID")
COUNT=$(echo "$ROSTER" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 0)
chk "roster-count" "$COUNT" 2

# 4) Mark everyone present
IDS=$(echo "$ROSTER" | python3 -c 'import json,sys; print(json.dumps([{"userId": r["userId"], "status": "present"} for r in json.load(sys.stdin)]))')
code=$(curl -s -b /tmp/hoe.jar -X POST $B/api/admin/sessions/$SID/attendance -H 'Content-Type: application/json' -d "{\"groupId\":\"$GID\",\"rows\":$IDS}" -o /dev/null -w '%{http_code}')
chk "attendance-save" "$code" 200

# 5) Re-read roster: all present
chk "roster-all-present" "$(curl -s -b /tmp/hoe.jar "$B/api/admin/sessions/$SID/attendance?groupId=$GID" | python3 -c 'import json,sys; print(all(r["status"]=="present" for r in json.load(sys.stdin)))')" True

# 6) Student dashboard Events panel shows the new session
curl -s -c /tmp/stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null
curl -s -b /tmp/stu.jar $B/dashboard -o /tmp/stu-dash2.html
grep -q "$SNAME" /tmp/stu-dash2.html && chk "student-events-sees-session" yes yes || chk "student-events-sees-session" no yes

# 7) Student cannot create sessions (403 via API level guard)
code=$(curl -s -b /tmp/stu.jar -X POST $B/api/admin/sessions -H 'Content-Type: application/json' -d '{"name":"X","date":"2026-09-14"}' -o /dev/null -w '%{http_code}')
chk "student-session-403" "$code" 403

# 8) HoE cannot reach HoA-only admin (mass invite) — guard already covered
#    but confirm HoE /invites page redirects (role guard in the page)
chk "hoe-invites-redirect" "$(curl -s -b /tmp/hoe.jar $B/invites -o /dev/null -w '%{http_code}')" 307

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
