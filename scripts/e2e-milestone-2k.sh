#!/usr/bin/env bash
# Milestone 2k e2e — Invitation lifecycle (org email, mail, filter, revoke, resend, register).
# Requires: postgres up, API (:3000) and web (:3100) running the CURRENT build.
set -u
A=${API_URL:-http://localhost:3000}
B=${WEB_URL:-http://localhost:3100}
TS=$(date +%s)
F="E2K$TS"
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }

# 0) HoA session
TOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$TOK" ] && chk "token" ok ok || chk "token" missing ok
curl -s -c /tmp/e2k-hoa.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' -o /dev/null

# 1) mass invite (3 rows) → org emails generated
code=$(curl -s -b /tmp/e2k-hoa.jar -X POST $B/api/admin/invitations/mass -H 'Content-Type: application/json' \
  -d "{\"rows\":[{\"firstName\":\"$F\",\"lastName\":\"Alpha\",\"personalEmail\":\"$TS.alpha@gmail.com\"},{\"firstName\":\"$F\",\"lastName\":\"Beta\",\"personalEmail\":\"$TS.beta@gmail.com\"},{\"firstName\":\"$F\",\"lastName\":\"Gamma\",\"personalEmail\":\"$TS.gamma@gmail.com\"}],\"role\":\"student\"}" \
  -o /tmp/e2k-mass.json -w '%{http_code}')
case "$code" in 200|201) chk "mass-create" ok ok ;; *) chk "mass-create" "$code" 2xx ;; esac
LOWER=$(echo "$F" | tr '[:upper:]' '[:lower:]')
chk "org-email-alpha" "$(python3 -c "import json;print(json.load(open('/tmp/e2k-mass.json'))['invitations'][0]['orgEmail'])")" "$LOWER.alpha@akibatech.com"
chk "personal-email" "$(python3 -c "import json;print(json.load(open('/tmp/e2k-mass.json'))['invitations'][0]['personalEmail'])")" "$TS.alpha@gmail.com"

# 2) list shape + total
curl -s -b /tmp/e2k-hoa.jar "$B/api/admin/invitations?limit=100" -o /tmp/e2k-list.json
chk "list-shape" "$(python3 -c "import json;d=json.load(open('/tmp/e2k-list.json'));print('rows' in d and 'total' in d)")" True

# 3) filter pending
curl -s -b /tmp/e2k-hoa.jar "$B/api/admin/invitations?status=pending&limit=100" -o /tmp/e2k-pend.json
chk "filter-pending" "$(python3 -c "import json;d=json.load(open('/tmp/e2k-pend.json'));print(all(r['usedAt'] is None and r['revokedAt'] is None for r in d['rows']))")" True

# 4) search
curl -s -b /tmp/e2k-hoa.jar "$B/api/admin/invitations?q=$LOWER&limit=100" -o /tmp/e2k-q.json
chk "search-q" "$(python3 -c "import json;d=json.load(open('/tmp/e2k-q.json'));print(all('$LOWER' in ((r['firstName'] or '')+' '+(r['lastName'] or '')).lower() for r in d['rows']) and len(d['rows'])>=3)")" True

# 5) pagination
curl -s -b /tmp/e2k-hoa.jar "$B/api/admin/invitations?limit=1&offset=0" -o /tmp/e2k-page.json
chk "pagination" "$(python3 -c "import json;print(len(json.load(open('/tmp/e2k-page.json'))['rows'])<=1)")" True

# 6) revoke Alpha
AID=$(python3 -c "import json;print(json.load(open('/tmp/e2k-mass.json'))['invitations'][0]['id'])")
code=$(curl -s -b /tmp/e2k-hoa.jar -X POST $B/api/admin/invitations/$AID/revoke -o /dev/null -w '%{http_code}')
case "$code" in 200|201) chk "revoke-ok" ok ok ;; *) chk "revoke-ok" "$code" 2xx ;; esac

# 7) register with revoked Alpha token → 409 conflict
ATOK=$(python3 -c "import json;print(json.load(open('/tmp/e2k-mass.json'))['invitations'][0]['token'])")
code=$(curl -s -X POST $B/api/auth/register-invite -H 'Content-Type: application/json' -d "{\"token\":\"$ATOK\",\"name\":\"$F Alpha\",\"password\":\"password123\",\"country\":\"Ethiopia\",\"university\":\"AAU\"}" -o /dev/null -w '%{http_code}')
chk "revoked-register-409" "$code" 409

# 8) resend Gamma (still pending after)
GID=$(python3 -c "import json;print(json.load(open('/tmp/e2k-mass.json'))['invitations'][2]['id'])")
code=$(curl -s -b /tmp/e2k-hoa.jar -X POST $B/api/admin/invitations/$GID/resend -o /dev/null -w '%{http_code}')
case "$code" in 200|201) chk "resend-ok" ok ok ;; *) chk "resend-ok" "$code" 2xx ;; esac

# 9) register with valid Beta token → org-email user created
BTOK=$(python3 -c "import json;print(json.load(open('/tmp/e2k-mass.json'))['invitations'][1]['token'])")
code=$(curl -s -X POST $B/api/auth/register-invite -H 'Content-Type: application/json' -d "{\"token\":\"$BTOK\",\"name\":\"$F Beta\",\"password\":\"password123\",\"country\":\"Ethiopia\",\"university\":\"AAU\"}" -o /tmp/e2k-reg.json -w '%{http_code}')
case "$code" in 200|201) chk "register-ok" ok ok ;; *) chk "register-ok" "$code" 2xx ;; esac
chk "register-org-email" "$(python3 -c "import json;print(json.load(open('/tmp/e2k-reg.json'))['user']['email'])")" "$LOWER.beta@akibatech.com"

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
