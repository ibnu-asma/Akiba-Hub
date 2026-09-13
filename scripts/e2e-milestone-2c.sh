#!/usr/bin/env bash
# Milestone 2c e2e — content foundation: problems / tracks / exercises.
# Requires: postgres up, API (:3000) and web (:3100) running the CURRENT build.
set -u
B=${WEB_URL:-http://localhost:3100}
A=${API_URL:-http://localhost:3000}
TS=$(date +%s)
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }
pyid() { python3 -c "import json,sys;d=json.load(open('$1'));print(d.get('$2',''))" 2>/dev/null; }

# 0) sessions: HoE via BFF (cookie) + HoA direct API (token for direct reads)
code=$(curl -s -c /tmp/e2c-hoe.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"head@akibatech.com","password":"a2sv-demo"}' -o /dev/null -w '%{http_code}')
chk "hoe-login" "$code" 200
TOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$TOK" ] && chk "api-token" ok ok || chk "api-token" missing ok
SGID=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/super-groups | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['id'])")
[ -n "$SGID" ] && chk "super-group-id" ok ok || chk "super-group-id" missing ok

# 1) pages render for HoE, guarded for student
for p in problems/new tracks/new exercises/new; do
  chk "hoe-page-$p" "$(curl -s -b /tmp/e2c-hoe.jar $B/$p -o /dev/null -w '%{http_code}')" 200
done
curl -s -c /tmp/e2c-stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null
chk "stu-page-guard" "$(curl -s -b /tmp/e2c-stu.jar $B/problems/new -o /dev/null -w '%{http_code}')" 307
chk "stu-write-403" "$(curl -s -b /tmp/e2c-stu.jar -X POST $B/api/admin/problems -H 'Content-Type: application/json' -d "{\"name\":\"Nope $TS\",\"platform\":\"leetcode\",\"difficulty\":\"easy\",\"tags\":[],\"link\":\"https://leetcode.com\"}" -o /dev/null -w '%{http_code}')" 403

# 2) create problem via BFF (HoE)
PNAME="E2E 2C Problem $TS"
code=$(curl -s -b /tmp/e2c-hoe.jar -X POST $B/api/admin/problems -H 'Content-Type: application/json' -d "{\"name\":\"$PNAME\",\"platform\":\"leetcode\",\"difficulty\":\"easy\",\"tags\":[\"Array\"],\"link\":\"https://leetcode.com/e2e-$TS\"}" -o /tmp/e2c-problem.json -w '%{http_code}')
case "$code" in 200|201) chk "problem-create" "$code" "$code" ;; *) chk "problem-create" "$code" 201 ;; esac
PID=$(pyid /tmp/e2c-problem.json id)
[ -n "$PID" ] && chk "problem-id" ok ok || chk "problem-id" missing ok

# 3) problem is newest-first in the library
pynew() { python3 -c "import json,sys;print(json.load(open('/tmp/e2c-lib.json'))[0]['name'])"; }
curl -sm 5 -H "Authorization: Bearer $TOK" $A/problems -o /tmp/e2c-lib.json
chk "problem-newest-first" "$(pynew)" "$PNAME"

# 4) create a track via BFF — 201 on a fresh phase slot; on reruns the slot for
#    this sg+phase is taken, so the friendly 400 is also a PASS (idempotent suite).
TNAME="E2E 2C Track $TS"
code=$(curl -s -b /tmp/e2c-hoe.jar -X POST $B/api/admin/tracks -H 'Content-Type: application/json' -d "{\"superGroupId\":\"$SGID\",\"phase\":\"PHASE_II\",\"name\":\"$TNAME\"}" -o /tmp/e2c-track.json -w '%{http_code}')
TID=$(pyid /tmp/e2c-track.json id)
if [ -n "$TID" ]; then chk "track-create" ok ok; else
  case "$code" in
    400) grep -q 'already exists' /tmp/e2c-track.json && chk "track-create" rerun-friendly-400 rerun-friendly-400 || chk "track-create" "$code" rerun-400-friendly ;;
    *) chk "track-create" "$code" 201 ;;
  esac
  TID=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/tracks | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['id'])")
  chk "track-fallback" "$([ -n "$TID" ] && echo ok)" ok
fi

# 5) duplicate track same sg+phase -> 400 with the friendly message
code=$(curl -s -b /tmp/e2c-hoe.jar -X POST $B/api/admin/tracks -H 'Content-Type: application/json' -d "{\"superGroupId\":\"$SGID\",\"phase\":\"PHASE_II\",\"name\":\"Dup $TS\"}" -o /tmp/e2c-dup.json -w '%{http_code}')
chk "dup-track-400" "$code" 400
grep -q 'already exists' /tmp/e2c-dup.json && chk "dup-track-message" ok ok || chk "dup-track-message" missing ok

# 6) attach the problem to the track (idempotent: 1 then 0)
code=$(curl -s -b /tmp/e2c-hoe.jar -X POST $B/api/admin/tracks/$TID/problems -H 'Content-Type: application/json' -d "{\"problemIds\":[\"$PID\"]}" -o /tmp/e2c-attach.json -w '%{http_code}')
case "$code" in 200|201) chk "exercise-attach" ok ok ;; *) chk "exercise-attach" "$code" 200 ;; esac
chk "exercise-added-1" "$(pyid /tmp/e2c-attach.json added)" 1
curl -s -b /tmp/e2c-hoe.jar -X POST $B/api/admin/tracks/$TID/problems -H 'Content-Type: application/json' -d "{\"problemIds\":[\"$PID\"]}" -o /tmp/e2c-attach2.json
chk "exercise-dup-0" "$(pyid /tmp/e2c-attach2.json added)" 0

# 7) track problems contain the exercise, ordered; audit trail recorded
curl -sm 5 -H "Authorization: Bearer $TOK" $A/tracks/$TID/problems -o /tmp/e2c-tp.json
chk "track-problems" "$(python3 -c "import json;print(any(p['id']=='$PID' for p in json.load(open('/tmp/e2c-tp.json'))))")" True
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/activities?limit=20" -o /tmp/e2c-act.json
chk "audit-exercise" "$(python3 -c "import json;acts=json.load(open('/tmp/e2c-act.json'));print(any('exercises to track' in a['description'] for a in acts))")" True
chk "audit-problem" "$(python3 -c "import json;acts=json.load(open('/tmp/e2c-act.json'));print(any(\"problem called '$PNAME'\" in a['description'] for a in acts))")" True

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]