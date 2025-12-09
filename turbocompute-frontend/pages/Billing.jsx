// src/pages/Billing.jsx
import React from "react";

export default function Billing(){
  return (
    <div style={{maxWidth:1200, margin:'0 auto'}}>
      <h2>Billing & Wallet</h2>

      <section style={{marginTop:20, display:'grid', gridTemplateColumns:'1fr 320px', gap:20}}>
        <div>
          <div style={{padding:16, background:'#0b1117', border:'1px solid rgba(255,255,255,0.03)', borderRadius:8}}>
            <h3>Wallet</h3>
            <p>Balance: ₹0.00</p>
            <button style={{padding:'8px 12px'}}>Add funds (Razorpay)</button>
          </div>

          <div style={{marginTop:16, padding:16, background:'#0b1117', border:'1px solid rgba(255,255,255,0.03)', borderRadius:8}}>
            <h3>Invoices</h3>
            <p>No invoices yet.</p>
          </div>
        </div>

        <div style={{padding:16, background:'#0b1117', border:'1px solid rgba(255,255,255,0.03)', borderRadius:8}}>
          <h3>Invoice preview</h3>
          <p>Select an invoice to preview here.</p>
        </div>
      </section>
    </div>
  );
}
