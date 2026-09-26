const email = "student@akibatech.com";
const password = "a2sv-demo";
(async () => {
  const loginRes = await fetch("http://localhost:3000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!loginRes.ok) {
    console.log("LOGIN FAILED", await loginRes.text());
    return;
  }
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  const meRes = await fetch("http://localhost:3000/auth/me", {
    headers: { Authorization: "Bearer " + token }
  });
  console.log("ME STATUS:", meRes.status);
  console.log("ME DATA:", await meRes.text());
})();
