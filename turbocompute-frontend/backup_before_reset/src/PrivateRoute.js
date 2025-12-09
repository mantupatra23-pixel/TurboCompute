// src/PrivateRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { isLoggedIn } from "./auth/auth";

const PrivateRoute = ({ children }) => {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
