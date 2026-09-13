#!/usr/bin/env bash
# Milestone 2h e2e — Summary reporting hub (6 aggregation endpoints, scope, guards).
# Requires: postgres up, API (:3000) and web (:3100) running the CURRENT build.
set -u
A=${API_URL:-http://localhost:3000}
B=${WEB_URL:-http://localhost:3100}
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }

ADMINTOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
HOETOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"head@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
STUTOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$ADMINTOK" ] && [ -n "$HOETOK" ] && chk "tokens" ok ok || chk "tokens" missing ok

# 1) every endpoint returns 200 for HoA + HoE; 403 for student (level-2 guard)
for ep in attendance consistency completion exercise upsolving divisions; do
  chk "hoa-$ep" "$(curl -sm 5 -H "Authorization: Bearer $ADMINTOK" $A/summary/$ep -o /dev/null -w '%{http_code}')" 200
  chk "hoe-$ep" "$(curl -sm 5 -H "Authorization: Bearer $HOETOK" $A/summary/$ep -o /dev/null -w '%{http_code}')" 200
  chk "stu-$ep-403" "$(curl -sm 5 -H "Authorization: Bearer $STUTOK" $A/summary/$ep -o /dev/null -w '%{http_code}')" 403
done

# 2) shape: attendance/consistency/completion are lists; others are objects
curl -sm 5 -H "Authorization: Bearer $ADMINTOK" $A/summary/attendance -o /tmp/e2h-att.json
curl -sm 5 -H "Authorization: Bearer $ADMINTOK" $A/summary/consistency -o /tmp/e2h-con.json
curl -sm 5 -H "Authorization: Bearer $ADMINTOK" $A/summary/divisions -o /tmp/e2h-div.json
chk "attendance-is-list" "$(python3 -c "import json;print(isinstance(json.load(open('/tmp/e2h-att.json')), list))")" True
chk "consistency-is-list" "$(python3 -c "import json;print(isinstance(json.load(open('/tmp/e2h-con.json')), list))")" True
chk "divisions-has-buckets" "$(python3 -c "import json;d=json.load(open('/tmp/e2h-div.json'));print('divisions' in d and 'unassigned' in d)")" True

# 3) scope: HoE sees a subset (<=) of HoA's students
HOE_N=$(curl -sm 5 -H "Authorization: Bearer $HOETOK" $A/summary/attendance | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")
HOA_N=$(curl -sm 5 -H "Authorization: Bearer $ADMINTOK" $A/summary/attendance | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")
chk "scope-subset" "$(python3 -c "print($HOE_N <= $HOA_N)")" True

# 4) web Summary page renders for HoE; guarded for student
curl -s -c /tmp/e2h-hoe.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"head@akibatech.com","password":"a2sv-demo"}' -o /dev/null
curl -s -c /tmp/e2h-stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null
chk "page-hoe" "$(curl -s -b /tmp/e2h-hoe.jar $B/summary -o /dev/null -w '%{http_code}')" 200
chk "page-stu-307" "$(curl -s -b /tmp/e2h-stu.jar $B/summary -o /dev/null -w '%{http_code}')" 307

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
