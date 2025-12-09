import React from "react";
import { useParams } from "react-router-dom";
import { Typography } from "@mui/material";

export default function InstanceDetails() {
  const { id } = useParams();
  return (
    <>
      <Typography variant="h4" sx={{ mb: 2 }}>Instance {id}</Typography>
      <Typography>Details for instance {id} (placeholder).</Typography>
    </>
  );
}
