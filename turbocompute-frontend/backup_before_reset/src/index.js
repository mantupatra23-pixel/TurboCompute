// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home"; // अगर पहले से नहीं है तो simple placeholder बनाना
import Login from "./pages/Login"; // placeholder

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<MainLayout><Home /></MainLayout>} />
      <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
    </Routes>
  </BrowserRouter>
);
