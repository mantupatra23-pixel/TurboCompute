// src/pages/Home.jsx
import React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";

export default function Home() {
  return (
    <Box>
      <Box sx={{ py: 6 }}>
        <Typography variant="h3">TurboCompute</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          Fast GPU cloud for creators & AI apps — pay-as-you-go, simple dashboard.
        </Typography>
        <Button href="/login" variant="contained" size="large">
          Get Started
        </Button>
      </Box>

      <Box sx={{ mt: 5 }}>
        <Grid container spacing={3}>
          {[
            { title: "Powerful GPUs", desc: "Access latest GPU instances" },
            { title: "Simple Billing", desc: "Transparent pricing & invoices" },
            { title: "Auto-scaling", desc: "Scale when you need" },
          ].map((f) => (
            <Grid item key={f.title} xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6">{f.title}</Typography>
                  <Typography color="text.secondary">{f.desc}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
