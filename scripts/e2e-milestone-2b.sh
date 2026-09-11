#!/usr/bin/env bash
# Milestone 2b E2E — Register Invite + HoA admin (super-groups, mass invites, groups).
# Requires `web` (next start -p 3100) and `api` (NestJS :3000) + Postgres up.
set -u
B=${WEB_URL:-http://localhost:3100}
TAG=$(date +%s)
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }

# HoA session
curl -s -c /tmp/hoa.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@a2sv.org","password":"a2sv-demo"}' -o /dev/null

# 1) Create super group via BFF (unique name per run)
code=$(curl -s -b /tmp/hoa.jar -X POST $B/api/admin/super-groups -H 'Content-Type: application/json' -d "{\"name\":\"SG-E2E-$TAG\"}" -o /tmp/sg.json -w '%{http_code}')
chk "bff-super-group" "$code" 201

# 2) Duplicate super group -> 409 CONFLICT (not 500)
code=$(curl -s -b /tmp/hoa.jar -X POST $B/api/admin/super-groups -H 'Content-Type: application/json' -d "{\"name\":\"SG-E2E-$TAG\"}" -o /tmp/sg-dup.json -w '%{http_code}')
chk "super-group-dupe-409" "$code" 409

# 3) Mass invite via BFF
EMAIL="student.$TAG@a2sv.org"
INV=$(curl -s -b /tmp/hoa.jar -X POST $B/api/admin/invitations/mass -H 'Content-Type: application/json' -d "{\"emails\":[\"$EMAIL\"],\"role\":\"student\"}")
TOKEN=$(echo "$INV" | python3 -c 'import json,sys; print(json.load(sys.stdin)["invitations"][0]["token"])' 2>/dev/null)
[ ${#TOKEN} -eq 64 ] && chk "mass-invite-token" "64" "64" || chk "mass-invite-token" "${#TOKEN}" "64"

# 4) Register via invite (public, no auth) — unique name so the derived
# email (name -> email, see API auth.service) stays unique per run
NAME="Student $TAG"
REG=$(curl -s -c /tmp/stu2.jar -X POST $B/api/auth/register-invite -H 'Content-Type: application/json' -d "{\"token\":\"$TOKEN\",\"name\":\"$NAME\",\"password\":\"a2sv-demo\",\"country\":\"Ethiopia\",\"university\":\"AAU\",\"linkedin\":\"https://linkedin.com/in/newstudent\"}" -w '|%{http_code}')
code=${REG##*|}
chk "invite-register" "$code" 201
grep -q hub_token /tmp/stu2.jar && chk "invite-cookie" ok ok || chk "invite-cookie" missing ok

# 5) Re-using the invite token -> 409 (invite already used)
code=$(curl -s -X POST $B/api/auth/register-invite -H 'Content-Type: application/json' -d "{\"token\":\"$TOKEN\",\"name\":\"X\",\"password\":\"abcdef\",\"country\":\"ET\",\"university\":\"U\"}" -o /dev/null -w '%{http_code}')
chk "invite-reuse-409" "$code" 409

# 6) New student reaches their dashboard
chk "student-dash" "$(curl -s -b /tmp/stu2.jar $B/dashboard -o /dev/null -w '%{http_code}')" 200

# 7) Create group via BFF
code=$(curl -s -b /tmp/hoa.jar -X POST $B/api/admin/groups -H 'Content-Type: application/json' -d "{\"name\":\"G-E2E-$TAG\",\"shortName\":\"G$TAG\"}" -o /tmp/grp.json -w '%{http_code}')
chk "bff-group" "$code" 201

# 8) Pages render (authed)
chk "invites-page" "$(curl -s -b /tmp/hoa.jar $B/invites -o /dev/null -w '%{http_code}')" 200
chk "groups-new-page" "$(curl -s -b /tmp/hoa.jar $B/groups/new -o /dev/null -w '%{http_code}')" 200
chk "super-groups-page" "$(curl -s -b /tmp/hoa.jar $B/super-groups -o /dev/null -w '%{http_code}')" 200
chk "register-invite-public" "$(curl -s $B/register-invite -o /dev/null -w '%{http_code}')" 200
chk "register-invite-missing-token" "$(curl -s $B/register-invite -o /dev/null -w '%{http_code}')" 200

# 9) Security: HoE cannot mass-invite (level guard -> 403)
curl -s -c /tmp/hoe.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"head@a2sv.org","password":"a2sv-demo"}' -o /dev/null
code=$(curl -s -b /tmp/hoe.jar -X POST $B/api/admin/invitations/mass -H 'Content-Type: application/json' -d '{"emails":["x@y.z"],"role":"student"}' -o /tmp/hoe-403.json -w '%{http_code}')
chk "hoe-forbidden-invite" "$code" 403

# 10) Student role-guard: /invites redirects to dashboard
chk "stu-no-invites" "$(curl -s -b /tmp/stu2.jar $B/invites -o /dev/null -w '%{http_code}')" 307

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
