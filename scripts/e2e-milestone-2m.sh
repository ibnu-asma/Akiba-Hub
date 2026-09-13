#!/usr/bin/env bash
# Milestone 2m e2e — Super Groups (create with groups, rename, set groups, delete).
# Requires: postgres up, API (:3000) and web (:3100) running the CURRENT build.
set -u
A=${API_URL:-http://localhost:3000}
B=${WEB_URL:-http://localhost:3100}
TS=$(date +%s)
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1 (=$2)"; else fail=$((fail+1)); echo "FAIL $1 (got=$2 want=$3)"; fi; }
pyid() { python3 -c "import json,sys;d=json.load(open('$1'));print(d.get('$2',''))" 2>/dev/null; }

TOK=$(curl -sm 5 -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' $A/auth/login | python3 -c "import json,sys;print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$TOK" ] && chk "token" ok ok || chk "token" missing ok
curl -s -c /tmp/e2m-hoa.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@akibatech.com","password":"a2sv-demo"}' -o /dev/null

# group ids (2 groups)
G1=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/groups | python3 -c "import json,sys;d=json.load(sys.stdin);print(d[0]['id'] if d else '')")
G2=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/groups | python3 -c "import json,sys;d=json.load(sys.stdin);print(d[1]['id'] if len(d)>1 else '')")
ORIG1=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/groups | python3 -c "import json,sys;d=json.load(sys.stdin);print((d[0]['superGroupId'] or 'null') if d else 'null')")
ORIG2=$(curl -sm 5 -H "Authorization: Bearer $TOK" $A/groups | python3 -c "import json,sys;d=json.load(sys.stdin);print((d[1]['superGroupId'] or 'null') if len(d)>1 else 'null')")
[ -n "$G1" ] && chk "groups" ok ok || chk "groups" missing ok

# 1) create with 2 groups
SNAME="E2M Super $TS"
code=$(curl -s -b /tmp/e2m-hoa.jar -X POST $B/api/admin/super-groups -H 'Content-Type: application/json' -d "{\"name\":\"$SNAME\",\"groupIds\":[\"$G1\",\"$G2\"]}" -o /tmp/e2m-sg.json -w '%{http_code}')
case "$code" in 200|201) chk "sg-create" ok ok ;; *) chk "sg-create" "$code" 2xx ;; esac
SID=$(pyid /tmp/e2m-sg.json id)
[ -n "$SID" ] && chk "sg-id" ok ok || chk "sg-id" missing ok

# 2) list includes it with 2 groups
curl -sm 5 -H "Authorization: Bearer $TOK" $A/super-groups -o /tmp/e2m-list.json
chk "sg-listed" "$(python3 -c "import json;rows=json.load(open('/tmp/e2m-list.json'));g=next((x for x in rows if x['id']=='$SID'),None);print(g is not None and len(g['groups'])==2)")" True

# 3) rename
code=$(curl -s -b /tmp/e2m-hoa.jar -X PATCH $B/api/admin/super-groups/$SID -H 'Content-Type: application/json' -d "{\"name\":\"$SNAME Renamed\"}" -o /dev/null -w '%{http_code}')
chk "sg-rename" "$code" 200

# 4) set groups to just G1
code=$(curl -s -b /tmp/e2m-hoa.jar -X POST $B/api/admin/super-groups/$SID/groups -H 'Content-Type: application/json' -d "{\"groupIds\":[\"$G1\"]}" -o /dev/null -w '%{http_code}')
case "$code" in 200|201) chk "sg-setgroups" ok ok ;; *) chk "sg-setgroups" "$code" 2xx ;; esac
curl -sm 5 -H "Authorization: Bearer $TOK" $A/super-groups -o /tmp/e2m-list2.json
chk "sg-one-group" "$(python3 -c "import json;rows=json.load(open('/tmp/e2m-list2.json'));g=next(x for x in rows if x['id']=='$SID');print(len(g['groups'])==1)")" True

# 5) delete
code=$(curl -s -b /tmp/e2m-hoa.jar -X DELETE $B/api/admin/super-groups/$SID -o /dev/null -w '%{http_code}')
chk "sg-delete" "$code" 200
curl -sm 5 -H "Authorization: Bearer $TOK" $A/super-groups -o /tmp/e2m-final.json
chk "sg-deleted" "$(python3 -c "import json;print(not any(x['id']=='$SID' for x in json.load(open('/tmp/e2m-final.json'))))")" True

# 6) restore the two groups' original super groups (non-destructive)
python3 - "$TOK" "$G1" "$ORIG1" "$G2" "$ORIG2" <<'PY'
import json, sys, urllib.request
tok, g1, sg1, g2, sg2 = sys.argv[1:6]
def req(path, method='GET', body=None):
    r = urllib.request.Request('http://localhost:3000' + path, method=method,
        data=body, headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(r))
def patch(gid, sgid):
    groups = req('/groups')
    g = next(x for x in groups if x['id'] == gid)
    req('/groups/' + gid, 'PATCH', json.dumps({'name': g['name'], 'shortName': g['shortName'], 'superGroupId': None if sgid == 'null' else sgid}).encode())
patch(g1, sg1)
patch(g2, sg2)
print('restored')
PY

# 7) page guards
curl -s -c /tmp/e2m-stu.jar -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@akibatech.com","password":"a2sv-demo"}' -o /dev/null
chk "page-hoa" "$(curl -s -b /tmp/e2m-hoa.jar $B/super-groups -o /dev/null -w '%{http_code}')" 200
chk "page-stu-307" "$(curl -s -b /tmp/e2m-stu.jar $B/super-groups -o /dev/null -w '%{http_code}')" 307

echo "----------------------------------------"
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
