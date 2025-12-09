import React from "react";
import { Link as RouterLink, Outlet, useNavigate } from "react-router-dom";
import { Drawer, List, ListItem, ListItemText, Toolbar, AppBar, Typography, Box, IconButton } from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import { clearToken } from "../Auth";

const drawerWidth = 240;

export default function Layout() {
  const navigate = useNavigate();
  const onLogout = () => {
    clearToken();
    navigate("/login");
  };

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            TurboCompute
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={{ width: drawerWidth, [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" } }}>
        <Toolbar />
        <List>
          <ListItem button component={RouterLink} to="/">
            <ListItemText primary="Home" />
          </ListItem>
          <ListItem button component={RouterLink} to="/dashboard">
            <ListItemText primary="Dashboard" />
          </ListItem>
          <ListItem button component={RouterLink} to="/instances">
            <ListItemText primary="Instances" />
          </ListItem>
          <ListItem button component={RouterLink} to="/wallet">
            <ListItemText primary="Wallet" />
          </ListItem>
          <ListItem button onClick={onLogout}>
            <ListItemText primary="Logout" />
          </ListItem>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
