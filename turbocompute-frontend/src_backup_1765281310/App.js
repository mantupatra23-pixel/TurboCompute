// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import theme from "./theme";
import Layout from "./components/Layout";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Instances from "./pages/Instances";
import InstanceDetails from "./pages/InstanceDetails";
import Billing from "./pages/Billing";

import PrivateRoute from "./PrivateRoute";

/**
 * InstanceIdWrapper
 * - Reads :id from URL and renders InstanceDetails
 * - Keeps App.js routes clean and works with PrivateRoute
 */
function InstanceIdWrapper() {
  const { id } = useParams();
  return <InstanceDetails id={id} />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Private Routes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />

            <Route
              path="/instances"
              element={
                <PrivateRoute>
                  <Instances />
                </PrivateRoute>
              }
            />

            {/* instance details with param */}
            <Route
              path="/instances/:id"
              element={
                <PrivateRoute>
                  <InstanceIdWrapper />
                </PrivateRoute>
              }
            />

            {/* NEW: Billing (wallet / invoice pages) */}
            <Route
              path="/billing"
              element={
                <PrivateRoute>
                  <Billing />
                </PrivateRoute>
              }
            />

            {/* add more public/private routes below as needed */}
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
