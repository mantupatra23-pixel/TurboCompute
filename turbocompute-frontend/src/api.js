const API_BASE = process.env.REACT_APP_API_BASE || "";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) {
    const err = new Error(data?.detail || data?.error || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function signup({ email, password, name, referral_code }) {
  return request("/signup", { method: "POST", body: { email, password, name, referral_code } });
}

export async function login({ email, password }) {
  return request("/login", { method: "POST", body: { email, password } });
}

export async function getWallet(token) {
  return request("/wallet", { method: "GET", token });
}

export async function createOrder({ amount }, token) {
  return request("/wallet/create-order", { method: "POST", body: { amount }, token });
}

export async function createInstance({ hours, plan_code }, token) {
  return request("/create-instance", { method: "POST", body: { hours, plan_code }, token });
}

export async function getInstances(token) {
  return request("/instances", { method: "GET", token });
}

export async function getInstanceStatus(instance_id, token) {
  return request(`/status/${instance_id}`, { method: "GET", token });
}

export async function terminateInstance(instance_id, token) {
  return request(`/terminate/${instance_id}`, { method: "POST", token });
}
