import React from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";

import Layout from "./components/Layout";
import PrivateRoute from "./PrivateRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Instances from "./pages/Instances";
import InstanceDetails from "./pages/InstanceDetails";
import Billing from "./pages/Billing";
import GpuLogs from "./pages/GpuLogs";

function InstanceIdWrapper() {
  const { id } = useParams();
  return <InstanceDetails id={id} />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="/dashboard"
              element={<PrivateRoute><Dashboard /></PrivateRoute>}
            />
            <Route
              path="/instances"
              element={<PrivateRoute><Instances /></PrivateRoute>}
            />
            <Route
              path="/instances/:id"
              element={<PrivateRoute><InstanceIdWrapper /></PrivateRoute>}
            />
            <Route
              path="/billing"
              element={<PrivateRoute><Billing /></PrivateRoute>}
            />
            <Route
              path="/logs"
              element={<PrivateRoute><GpuLogs /></PrivateRoute>}
            />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}
