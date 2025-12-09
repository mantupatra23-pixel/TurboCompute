// src/pages/Instances.jsx
import React, { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import InstanceCard from "../components/InstanceCard";
import InstanceDetails from "../components/InstanceDetails";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://turbocompute.onrender.com";

export default function Instances() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  async function loadInstances() {
    try {
      const res = await fetch(`${BACKEND}/api/instances`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("tc_token") }
      });

      const data = await res.json();
      setInstances(data.instances || []);
    } catch (e) {
      console.log(e);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadInstances();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>GPU Instances</h1>

      {loading && (
        <div style={{ marginTop: 30, textAlign: "center" }}>
          <CircularProgress />
        </div>
      )}

      {!loading && instances.length === 0 && (
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <p>No instances found</p>
          <Button variant="contained">Create Instance</Button>
        </div>
      )}

      <Grid container spacing={2} sx={{ mt: 2 }}>
        {instances.map((item) => (
          <Grid item xs={12} md={4} key={item.id}>
            <InstanceCard data={item} onClick={() => setSelected(item)} />
          </Grid>
        ))}
      </Grid>

      {selected && (
        <InstanceDetails
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          instance={selected}
        />
      )}
    </div>
  );
}
