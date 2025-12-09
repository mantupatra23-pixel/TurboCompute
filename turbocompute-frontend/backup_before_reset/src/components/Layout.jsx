// src/components/Layout.jsx
import React from "react";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import NavBar from "./NavBar";

export default function Layout({ children }) {
  return (
    <>
      <NavBar />
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>{children}</Box>
      </Container>
    </>
  );
}
