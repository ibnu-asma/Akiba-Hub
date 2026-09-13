#!/usr/bin/env bash
# Milestone 2j e2e — Forum (post, vote toggle, comment, guards).
# Requires: postgres up, API (:3000) and web (:3100) running the CURRENT build.
set -u
A=${API_URL:-http://localhost:3000}
B=${WEB_URL:-http://localhost:3100}
TS=$(date +%s)
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }
pyid() { python3 -c "import json,sys;d=json.load(open('$1'));print(d.get('$2',''))" 2>/dev/null; }

STUTOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$STUTOK" ] && chk "token" ok ok || chk "token" missing ok
curl -s -c /tmp/e2j-stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null

# 1) unauth 401
chk "list-unauth-401" "$(curl -sm 5 $A/posts -o /dev/null -w '%{http_code}')" 401

# 2) create post via BFF
code=$(curl -s -b /tmp/e2j-stu.jar -X POST $B/api/posts -H 'Content-Type: application/json' -d "{\"title\":\"E2J Post $TS\",\"body\":\"Hello forum\"}" -o /tmp/e2j-post.json -w '%{http_code}')
case "$code" in 200|201) chk "post-create" ok ok ;; *) chk "post-create" "$code" 2xx ;; esac
PID=$(pyid /tmp/e2j-post.json id)
[ -n "$PID" ] && chk "post-id" ok ok || chk "post-id" missing ok

# 3) list joined with author + score
curl -sm 5 -H "Authorization: Bearer $STUTOK" "$A/posts?sort=latest" -o /tmp/e2j-list.json
chk "post-listed" "$(python3 -c "import json;rows=json.load(open('/tmp/e2j-list.json'));print(any(r['id']=='$PID' and r['userName']=='Geleta Daba' for r in rows))")" True

# 4) upvote then downvote → score returns to 0 (toggle)
curl -sm 5 -H "Authorization: Bearer $STUTOK" -X POST $A/posts/$PID/vote -H 'Content-Type: application/json' -d '{"value":1}' -o /dev/null
curl -sm 5 -H "Authorization: Bearer $STUTOK" "$A/posts?sort=latest" -o /tmp/e2j-up.json
chk "upvote-score-1" "$(python3 -c "import json;print(next(r['score'] for r in json.load(open('/tmp/e2j-up.json')) if r['id']=='$PID'))")" 1
curl -sm 5 -H "Authorization: Bearer $STUTOK" -X POST $A/posts/$PID/vote -H 'Content-Type: application/json' -d '{"value":1}' -o /dev/null
curl -sm 5 -H "Authorization: Bearer $STUTOK" "$A/posts?sort=latest" -o /tmp/e2j-un.json
chk "unvote-score-0" "$(python3 -c "import json;print(next(r['score'] for r in json.load(open('/tmp/e2j-un.json')) if r['id']=='$PID'))")" 0

# 5) comment
code=$(curl -s -b /tmp/e2j-stu.jar -X POST $B/api/posts/$PID/comments -H 'Content-Type: application/json' -d '{"body":"Nice post"}' -o /dev/null -w '%{http_code}')
case "$code" in 200|201) chk "comment-create" ok ok ;; *) chk "comment-create" "$code" 2xx ;; esac
chk "comment-count-1" "$(curl -sm 5 -H "Authorization: Bearer $STUTOK" $A/posts/$PID/comments | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")" 1

# 6) web forum page renders
chk "forum-page" "$(curl -s -b /tmp/e2j-stu.jar $B/forum -o /dev/null -w '%{http_code}')" 200

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
