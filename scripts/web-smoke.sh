#!/usr/bin/env bash
# Web smoke test — run with `web` (next start -p 3100) and `api` (NestJS :3000) up.
set -u
B=${WEB_URL:-http://localhost:3100}
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }

# 1) HoA login via BFF -> cookie
code=$(curl -s -c /tmp/hoa.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' -o /tmp/hoa-login.json -w '%{http_code}')
chk "hoa-login" "$code" 200
grep -q hub_token /tmp/hoa.jar && chk "hoa-cookie" present present || chk "hoa-cookie" missing present

# 2) HoA dashboard: 3 nav sections + widgets
# NOTE: Next.js embeds an RSC flight payload inline, so UI strings appear twice.
#       Presence (>0) is the assertion; absence (=0) is the security check.
curl -s -b /tmp/hoa.jar $B/dashboard -o /tmp/hoa-dash.html -w ''
chk "hoa-dash-200" "$(curl -s -b /tmp/hoa.jar $B/dashboard -o /tmp/hoa-dash.html -w '%{http_code}')" 200
academy=$(grep -o 'Head of Academy' /tmp/hoa-dash.html | wc -l); [ "$academy" -ge 2 ] && chk "hoa-section-academy" "yes($academy)" "yes($academy)" || chk "hoa-section-academy" "no($academy)" "present"
education=$(grep -o 'Head of Education' /tmp/hoa-dash.html | wc -l); [ "$education" -ge 1 ] && chk "hoa-section-education" "yes($education)" "yes($education)" || chk "hoa-section-education" "no($education)" "present"
chk "hoa-section-student" "$(grep -o '>Student<' /tmp/hoa-dash.html | wc -l)" 1
chk "hoa-recent-actions" "$(grep -c 'Recent Actions' /tmp/hoa-dash.html)" 1
chk "hoa-welcome" "$(grep -c 'Welcome back' /tmp/hoa-dash.html)" 1

# 3) HoE dashboard: 2 sections, no academy leak
curl -s -c /tmp/hoe.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"head@akibatech.com","password":"a2sv-demo"}' -o /dev/null
chk "hoe-dash-200" "$(curl -s -b /tmp/hoe.jar $B/dashboard -o /tmp/hoe-dash.html -w '%{http_code}')" 200
chk "hoe-has-attendance" "$(grep -c 'Take attendance' /tmp/hoe-dash.html)" 1
chk "hoe-no-academy" "$(grep -o 'Generate Invite' /tmp/hoe-dash.html | wc -l)" 0
chk "hoe-welcome" "$(grep -c 'Welcome back' /tmp/hoe-dash.html)" 1

# 4) Student dashboard: 1 section, no privileged leaks
curl -s -c /tmp/stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null
chk "stu-dash-200" "$(curl -s -b /tmp/stu.jar $B/dashboard -o /tmp/stu-dash.html -w '%{http_code}')" 200
# 3 = sidebar section title + role badge + quote-banner role watermark
chk "stu-has-student" "$(grep -o '>Student<' /tmp/stu-dash.html | wc -l)" 3
chk "stu-no-attendance" "$(grep -o 'Take attendance' /tmp/stu-dash.html | wc -l)" 0
chk "stu-no-invite" "$(grep -o 'Generate Invite' /tmp/stu-dash.html | wc -l)" 0

# 5) Auth guard + placeholders + 404 + error contract
loc=$(curl -s $B/dashboard -o /dev/null -w '%{redirect_url}')
case "$loc" in */login) chk "anon-guard" ok ok ;; *) chk "anon-guard" "$loc" ok ;; esac
chk "placeholder-200" "$(curl -s -b /tmp/hoa.jar $B/super-groups -o /dev/null -w '%{http_code}')" 200
chk "unknown-404" "$(curl -s -b /tmp/hoa.jar $B/nonexistent-xyz -o /dev/null -w '%{http_code}')" 404
# short password -> API Zod validation rejects before auth (400, field issues)
code=$(curl -s -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"wrong"}' -o /tmp/bad1.json -w '%{http_code}')
chk "short-pass-400" "$code" 400
grep -q VALIDATION_ERROR /tmp/bad1.json && chk "short-pass-code" ok ok || chk "short-pass-code" missing ok
# well-formed but wrong credentials -> 403 FORBIDDEN
code=$(curl -s -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"wrong-password-123"}' -o /tmp/bad2.json -w '%{http_code}')
chk "bad-login-403" "$code" 403
grep -q '"code":"FORBIDDEN"' /tmp/bad2.json && chk "bad-login-code" ok ok || chk "bad-login-code" missing ok

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
