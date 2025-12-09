import React from "react";
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("tc_token");
  if (!token) {
    window.location.href = "/login";
    return null;
  }
  return children;
};
export default PrivateRoute;
