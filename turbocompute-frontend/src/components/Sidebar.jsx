import React from "react";
import { Link } from "react-router-dom";
import { Box, List, ListItem, ListItemText, Typography } from "@mui/material";

export default function Sidebar() {
  return (
    <Box sx={{
      width: 260,
      bgcolor: "#0b1220",
      color: "#cfe8ff",
      px: 2,
      py: 3,
      borderRight: "1px solid rgba(255,255,255,0.02)"
    }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>TurboCompute</Typography>
      <List>
        <ListItem button component={Link} to="/">
          <ListItemText primary="Home" />
        </ListItem>
        <ListItem button component={Link} to="/dashboard">
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button component={Link} to="/instances">
          <ListItemText primary="Instances" />
        </ListItem>
        <ListItem button component={Link} to="/gpulogs">
          <ListItemText primary="GPU Logs" />
        </ListItem>
        <ListItem button component={Link} to="/login">
          <ListItemText primary="Login" />
        </ListItem>
      </List>
    </Box>
  );
}
