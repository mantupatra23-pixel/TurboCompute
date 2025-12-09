import React, { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function doLogin() {
    localStorage.setItem("tc_token", "testtoken");
    window.location.href = "/dashboard";
  }

  return (
    <div>
      <h2>Login</h2>
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" onChange={(e) => setPassword(e.target.value)} />
      <button onClick={doLogin}>Login</button>
    </div>
  );
}
