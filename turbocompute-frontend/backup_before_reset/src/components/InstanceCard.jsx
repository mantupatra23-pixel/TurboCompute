// src/components/InstanceCard.jsx
import React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";

export default function InstanceCard({ data, onClick }) {
  const statusColor = {
    running: "success",
    stopped: "default",
    provisioning: "warning",
    error: "error",
  }[data.status] || "default";

  return (
    <Card onClick={onClick} sx={{ cursor: "pointer", borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6">{data.name}</Typography>

        <Chip
          label={data.status}
          color={statusColor}
          size="small"
          sx={{ mt: 1, textTransform: "capitalize" }}
        />

        <Typography variant="body2" sx={{ mt: 1 }}>
          GPU: {data.gpu_type}
        </Typography>
        <Typography variant="body2">
          RAM: {data.ram_gb} GB · CPU: {data.vcpu} vCPU
        </Typography>

        <Typography variant="body2" sx={{ mt: 1 }}>
          Price: ₹{data.price_per_hour}/hr
        </Typography>

        <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
          Manage
        </Button>
      </CardContent>
    </Card>
  );
}
