#!/usr/bin/env bash
# Milestone 2e e2e — Stipends & Funds (create fund, idempotent assign, mark paid, guards).
# Requires: postgres up, API (:3000) and web (:3100) running the CURRENT build.
set -u
B=${WEB_URL:-http://localhost:3100}
A=${API_URL:-http://localhost:3000}
TS=$(date +%s)
MONTH=$(date +%Y-%m)
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }
pyid() { python3 -c "import json,sys;d=json.load(open('$1'));print(d.get('$2',''))" 2>/dev/null; }

# 0) sessions: HoE via BFF (cookie) + HoA direct API token for reads
code=$(curl -s -c /tmp/e2e-hoe.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"head@akibatech.com","password":"a2sv-demo"}' -o /dev/null -w '%{http_code}')
chk "hoe-login" "$code" 200
TOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$TOK" ] && chk "api-token" ok ok || chk "api-token" missing ok

# the seed ships exactly one student (student@akibatech.com)
STU=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/users | python3 -c "import json,sys;rows=[u for u in json.load(sys.stdin) if u['role']=='student'];print(rows[0]['id'] if rows else '')")
[ -n "$STU" ] && chk "student-id" ok ok || chk "student-id" missing ok

# 1) page renders for HoE; guarded for student
chk "hoe-page" "$(curl -s -b /tmp/e2e-hoe.jar $B/stipends -o /dev/null -w '%{http_code}')" 200
curl -s -c /tmp/e2e-stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null
chk "stu-page-307" "$(curl -s -b /tmp/e2e-stu.jar $B/stipends -o /dev/null -w '%{http_code}')" 307
chk "stu-funds-403" "$(curl -s -b /tmp/e2e-stu.jar -X POST $B/api/admin/funds -H 'Content-Type: application/json' -d '{}' -o /dev/null -w '%{http_code}')" 403

# 2) create fund via BFF (HoE)
FNAME="E2E Fund $TS"
code=$(curl -s -b /tmp/e2e-hoe.jar -X POST $B/api/admin/funds -H 'Content-Type: application/json' -d "{\"name\":\"$FNAME\",\"description\":\"e2e\",\"amount\":5000,\"currency\":\"ETB\"}" -o /tmp/e2e-fund.json -w '%{http_code}')
case "$code" in 200|201) chk "fund-create" ok ok ;; *) chk "fund-create" "$code" 2xx ;; esac
FID=$(pyid /tmp/e2e-fund.json id)
[ -n "$FID" ] && chk "fund-id" ok ok || chk "fund-id" missing ok

# 3) funds list carries 0 roll-ups for the fresh fund
curl -sm 5 -H "Authorization: Bearer $TOK" $A/funds -o /tmp/e2e-funds.json
chk "funds-rollup-0" "$(python3 -c "import json;rows=json.load(open('/tmp/e2e-funds.json'));print(1 if next((f for f in rows if f['id']=='$FID'), {}).get('paidTotal',-1)==0 and next((f for f in rows if f['id']=='$FID'), {}).get('pendingTotal',-1)==0 else 0)")" 1

# 4) assign one stipend (pending by default)
code=$(curl -s -b /tmp/e2e-hoe.jar -X POST $B/api/admin/funds/$FID/stipends -H 'Content-Type: application/json' -d "{\"month\":\"$MONTH\",\"rows\":[{\"userId\":\"$STU\",\"amount\":800}]}" -o /tmp/e2e-assign.json -w '%{http_code}')
chk "assign-1" "$(pyid /tmp/e2e-assign.json assigned)" 1

# 5) idempotent re-assign (upsert): same row, updated amount, count stays 1
code=$(curl -s -b /tmp/e2e-hoe.jar -X POST $B/api/admin/funds/$FID/stipends -H 'Content-Type: application/json' -d "{\"month\":\"$MONTH\",\"rows\":[{\"userId\":\"$STU\",\"amount\":900}]}" -o /tmp/e2e-assign2.json -w '%{http_code}')
case "$code" in 200|201) chk "reassign-ok" ok ok ;; *) chk "reassign-ok" "$code" 2xx ;; esac
curl -sm 5 -H "Authorization: Bearer $TOK" $A/funds/$FID/stipends -o /tmp/e2e-stips.json
chk "reassign-count-1" "$(python3 -c "import json;print(len(json.load(open('/tmp/e2e-stips.json'))))")" 1
chk "reassign-amount" "$(python3 -c "import json;print(json.load(open('/tmp/e2e-stips.json'))[0]['amount'])")" 900

# 6) mark paid (PATCH via BFF); roll-ups move to paid
SID=$(python3 -c "import json;print(json.load(open('/tmp/e2e-stips.json'))[0]['id'])")
code=$(curl -s -b /tmp/e2e-hoe.jar -X PATCH $B/api/admin/stipends/$SID -H 'Content-Type: application/json' -d '{"status":"paid"}' -o /dev/null -w '%{http_code}')
chk "mark-paid" "$code" 200
curl -sm 5 -H "Authorization: Bearer $TOK" $A/funds -o /tmp/e2e-funds2.json
chk "paid-rollup" "$(python3 -c "import json;rows=json.load(open('/tmp/e2e-funds2.json'));print(next((f['paidTotal'] for f in rows if f['id']=='$FID'), 'x'))")" 900
chk "pending-rollup-0" "$(python3 -c "import json;rows=json.load(open('/tmp/e2e-funds2.json'));print(next((f['pendingTotal'] for f in rows if f['id']=='$FID'), 'x'))")" 0

# 7) audit trail: fund create + stipend assign + mark paid
curl -sm 5 -H "Authorization: Bearer $TOK" "$A/activities?limit=20" -o /tmp/e2e-act.json
chk "audit-fund" "$(python3 -c "import json;acts=json.load(open('/tmp/e2e-act.json'));print(any(\"created the fund called '$FNAME'\" in a['description'] for a in acts))")" True
chk "audit-assign" "$(python3 -c "import json;acts=json.load(open('/tmp/e2e-act.json'));print(any(\"assigned 1 stipends from the fund called '$FNAME'\" in a['description'] for a in acts))")" True
chk "audit-paid" "$(python3 -c "import json;acts=json.load(open('/tmp/e2e-act.json'));print(any('as paid' in a['description'] for a in acts))")" True

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
