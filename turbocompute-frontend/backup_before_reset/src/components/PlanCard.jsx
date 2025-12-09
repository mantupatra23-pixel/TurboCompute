// src/components/PlanCard.jsx
import React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function PlanCard({ plan, selected, onSelect }) {
  return (
    <Card variant={selected ? "elevation" : "outlined"} sx={{ borderRadius: 2, p: 1 }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography variant="h6">{plan.title}</Typography>
            <Typography variant="body2" color="text.secondary">{plan.desc}</Typography>
          </div>
          <div style={{ textAlign: "right" }}>
            <Typography variant="h6">₹ {plan.price_per_hour}/hr</Typography>
            {selected && <CheckCircleIcon color="success" sx={{ mt: 1 }} />}
          </div>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Button variant={selected ? "contained" : "outlined"} fullWidth onClick={onSelect}>
            {selected ? "Selected" : "Select"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
