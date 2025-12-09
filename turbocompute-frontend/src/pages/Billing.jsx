import React from "react";
import { Box, Typography, Paper } from "@mui/material";

/**
 * Simple Billing page stub — safe valid JSX.
 * Replace/extend later with your real UI.
 */
export default function Billing() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Billing
      </Typography>

      <Paper sx={{ p: 2 }}>
        <Typography>
          This is a placeholder Billing page. Replace this content with the real billing UI.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
          If you see this page, the parsing error has been fixed.
        </Typography>
      </Paper>
    </Box>
  );
}
