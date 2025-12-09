// src/components/NavBar.jsx
import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

export default function NavBar({ onMenu }) {
  const logged = Boolean(localStorage.getItem("tc_token"));

  const handleLogout = () => {
    localStorage.removeItem("tc_token");
    window.location.href = "/login";
  };

  return (
    <AppBar position="sticky" color="transparent" elevation={0}>
      <Toolbar sx={{ gap: 2 }}>
        <IconButton edge="start" onClick={onMenu} sx={{ mr: 1 }}>
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          TurboCompute
        </Typography>

        <Box>
          {!logged ? (
            <Button href="/login" variant="contained" color="primary">
              Login
            </Button>
          ) : (
            <Button onClick={handleLogout} variant="outlined" color="primary">
              Logout
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
