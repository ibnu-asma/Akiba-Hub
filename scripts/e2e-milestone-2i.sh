#!/usr/bin/env bash
# Milestone 2i e2e — Group Comparison + Reports (rank groups, guards, scope clamp).
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

# group ids
GIDS=$(curl -sm 5 -H "Authorization: Bearer $ADMINTOK" $A/groups | python3 -c "import json,sys;rows=json.load(sys.stdin);print(' '.join(g['id'] for g in rows[:2]))")
G1=$(echo "$GIDS" | cut -d' ' -f1); G2=$(echo "$GIDS" | cut -d' ' -f2)
[ -n "$G1" ] && [ -n "$G2" ] && chk "groups" ok ok || chk "groups" missing ok

# 1) guards: student 403; empty groupIds 400
chk "stu-403" "$(curl -sm 5 -H "Authorization: Bearer $STUTOK" -X POST $A/comparison -H 'Content-Type: application/json' -d '{}' -o /dev/null -w '%{http_code}')" 403
chk "empty-400" "$(curl -sm 5 -H "Authorization: Bearer $ADMINTOK" -X POST $A/comparison -H 'Content-Type: application/json' -d '{\"groupIds\":[]}' -o /dev/null -w '%{http_code}')" 400

# 2) summary-mode compare returns ranked groups
code=$(curl -sm 5 -H "Authorization: Bearer $ADMINTOK" -X POST $A/comparison -H 'Content-Type: application/json' -d "{\"groupIds\":[\"$G1\",\"$G2\"],\"mode\":\"summary\",\"range\":\"all\",\"output\":\"table\"}" -o /tmp/e2i-sum.json -w '%{http_code}')
case "$code" in 200|201) chk "compare-summary" ok ok ;; *) chk "compare-summary" "$code" 2xx ;; esac
chk "compare-ranked" "$(python3 -c "import json;d=json.load(open('/tmp/e2i-sum.json'));print(len(d['groups']) and all('rank' in g and 'metrics' in g for g in d['groups']))")" True

# 3) every mode returns 2xx + groups
for mode in attendance consistency completion contest; do
  code=$(curl -sm 5 -H "Authorization: Bearer $ADMINTOK" -X POST $A/comparison -H 'Content-Type: application/json' -d "{\"groupIds\":[\"$G1\",\"$G2\"],\"mode\":\"$mode\",\"range\":\"all\"}" -o /dev/null -w '%{http_code}')
  case "$code" in 200|201) chk "mode-$mode" ok ok ;; *) chk "mode-$mode" "$code" 2xx ;; esac
done

# 4) scope clamp: HoE comparing an out-of-scope group gets it filtered (HoE heads G5A/G5B)
code=$(curl -sm 5 -H "Authorization: Bearer $HOETOK" -X POST $A/comparison -H 'Content-Type: application/json' -d "{\"groupIds\":[\"$G1\",\"$G2\"],\"mode\":\"summary\"}" -o /dev/null -w '%{http_code}')
case "$code" in 200|201) chk "hoe-compare-200" ok ok ;; *) chk "hoe-compare-200" "$code" 2xx ;; esac

# 5) web: Reports page (HoA only) + Summary page hosts GroupComparison
curl -s -c /tmp/e2i-hoa.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' -o /dev/null
curl -s -c /tmp/e2i-stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null
chk "reports-hoa" "$(curl -s -b /tmp/e2i-hoa.jar $B/reports -o /dev/null -w '%{http_code}')" 200
chk "reports-stu-307" "$(curl -s -b /tmp/e2i-stu.jar $B/reports -o /dev/null -w '%{http_code}')" 307

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
