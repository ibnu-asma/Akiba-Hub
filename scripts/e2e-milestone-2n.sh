#!/usr/bin/env bash
# Milestone 2n e2e — Attendance (monthly grid + check-in capture, roster guards).
# Requires: postgres up, API (:3000) and web (:3100) running the CURRENT build.
set -u
A=${API_URL:-http://localhost:3000}
B=${WEB_URL:-http://localhost:3100}
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }

TOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$TOK" ] && chk "token" ok ok || chk "token" missing ok
MONTH=$(date +%Y-%m)

# a group with students + a session (G5A)
G5A=c917713b-a9b6-43de-97c2-3f90f65b4d73
SID=$(curl -sm 5 -H "Authorization: Bearer $TOK" "$A/sessions?all=1" | python3 -c "import json,sys;rows=json.load(sys.stdin);print(rows[0]['id'] if rows else '')")

# 1) monthly grid shape
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/sessions/attendance-grid?groupId=$G5A&month=$MONTH" -o /tmp/e2n-grid.json
chk "grid-shape" "$(python3 -c "import json;d=json.load(open('/tmp/e2n-grid.json'));print('sessions' in d and 'students' in d)")" True

# 2) roster returns checkInAt field
[ -n "$SID" ] && {
  curl -sm 5 -H "Authorization: Bearer $TOK" "$A/sessions/$SID/attendance?groupId=$G5A" -o /tmp/e2n-roster.json
  chk "roster-checkin" "$(python3 -c "import json;d=json.load(open('/tmp/e2n-roster.json'));print(all('checkInAt' in r for r in d) if isinstance(d,list) else False)")" True
} || chk "session-id" missing ok

# 3) page renders for HoE; student guarded
curl -s -c /tmp/e2n-hoe.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"head@akibatech.com","password":"a2sv-demo"}' -o /dev/null
curl -s -c /tmp/e2n-stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null
chk "page-hoe" "$(curl -s -b /tmp/e2n-hoe.jar $B/attendance -o /dev/null -w '%{http_code}')" 200
chk "page-stu-307" "$(curl -s -b /tmp/e2n-stu.jar $B/attendance -o /dev/null -w '%{http_code}')" 307

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
