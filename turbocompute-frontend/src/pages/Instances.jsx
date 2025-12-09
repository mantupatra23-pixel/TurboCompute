import React, { useEffect, useState } from "react";
import { getInstances, createInstance, terminateInstance } from "../api";
import { getToken } from "../Auth";
import { Button, Typography, List, ListItem, ListItemText, Box } from "@mui/material";

export default function Instances() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await getInstances(getToken());
      setInstances(data.instances || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, []);

  async function onCreate() {
    try {
      const res = await createInstance({ hours: 1, plan_code: "small" }, getToken());
      load();
      alert("Created: " + (res.id || "ok"));
    } catch (e) { alert(e.message || "error"); }
  }

  async function onTerminate(id) {
    if (!window.confirm("Terminate instance?")) return;
    await terminateInstance(id, getToken());
    load();
  }

  return (
    <Box>
      <Typography variant="h4">Instances</Typography>
      <Button variant="contained" onClick={onCreate} sx={{ my: 2 }}>Create Instance (1h)</Button>
      {loading && <div>Loading...</div>}
      <List>
        {instances.map(i => (
          <ListItem key={i.id} secondaryAction={<Button onClick={()=>onTerminate(i.id)}>Terminate</Button>}>
            <ListItemText primary={i.id} secondary={i.status} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
