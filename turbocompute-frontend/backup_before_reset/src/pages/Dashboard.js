// src/pages/Dashboard.js
import React, {useEffect, useState} from "react";
import api from "../api";
import { removeToken } from "../auth/auth";

export default function Dashboard(){
  const [ok, setOk] = useState(false);
  useEffect(()=>{
    api.get("/health").then(()=> setOk(true)).catch(()=> {
      setOk(false);
    });
  },[]);
  return (
    <div>
      <h1>TurboCompute Frontend</h1>
      {ok ? <p>✅ Backend connected. Welcome to dashboard.</p> : <p>Backend not reachable.</p>}
      <button onClick={()=>{ removeToken(); window.location.href="/login"; }}>Logout</button>
    </div>
  );
}
