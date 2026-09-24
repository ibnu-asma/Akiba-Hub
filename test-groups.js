const email = "student@akibatech.com";
const password = "a2sv-demo";
(async () => {
  const loginRes = await fetch("http://localhost:3000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const token = (await loginRes.json()).accessToken;
  const groupsRes = await fetch("http://localhost:3000/groups", {
    headers: { Authorization: "Bearer " + token }
  });
  console.log("GROUPS STATUS:", groupsRes.status);
})();
