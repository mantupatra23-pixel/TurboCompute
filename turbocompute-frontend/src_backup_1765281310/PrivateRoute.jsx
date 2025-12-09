import React from "react";

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem("tc_token");

  if (!token) {
    window.location.href = "/login"; // redirect if not logged in
    return null;
  }

  return children;
}
