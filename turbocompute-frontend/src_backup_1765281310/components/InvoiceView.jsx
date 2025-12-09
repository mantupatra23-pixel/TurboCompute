// src/components/InvoiceView.jsx
import React, { useRef } from "react";
import { Box, Typography, Divider, Button } from "@mui/material";

/**
 * InvoiceView
 * Props:
 *  - invoice: detailed invoice object (see Billing.jsx how it's fetched)
 *  - onClose: optional callback
 *
 * This component renders printable invoice HTML. The "Download PDF" uses window.print()
 * by opening a new window with the invoice HTML and calling print(). No external lib.
 */

function renderInvoiceHTML(invoice) {
  const itemsHtml = (invoice.items || []).map(
    (it, i) =>
      `<tr key=${i}>
        <td style="padding:8px;border:1px solid #eee">${it.desc}</td>
        <td style="padding:8px;border:1px solid #eee;text-align:center">${it.qty}</td>
        <td style="padding:8px;border:1px solid #eee;text-align:right">₹${(it.rate/100).toFixed(2)}</td>
        <td style="padding:8px;border:1px solid #eee;text-align:right">₹${(it.amount/100).toFixed(2)}</td>
      </tr>`
  ).join("");

  const html = `
  <html>
  <head>
    <meta charset="utf-8"/>
    <title>Invoice ${invoice.invoice_no}</title>
  </head>
  <body style="font-family: Arial, Helvetica, sans-serif; color:#222; padding:24px;">
    <h2>TurboCompute</h2>
    <div>Invoice #: <strong>${invoice.invoice_no}</strong></div>
    <div>Date: ${new Date(invoice.created_at).toLocaleString()}</div>
    <hr/>
    <h4>Bill To</h4>
    <div>${(invoice.customer?.name) || ""}</div>
    <div>${(invoice.customer?.email) || ""}</div>
    <hr/>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #eee;text-align:left">Description</th>
          <th style="padding:8px;border:1px solid #eee;text-align:center">Qty</th>
          <th style="padding:8px;border:1px solid #eee;text-align:right">Rate</th>
          <th style="padding:8px;border:1px solid #eee;text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="margin-top:12px; text-align:right;">
      <div>Subtotal: ₹${(invoice.subtotal/100 || 0).toFixed(2)}</div>
      <div>Tax: ₹${(invoice.tax/100 || 0).toFixed(2)}</div>
      <div style="font-weight:700; margin-top:6px;">Total: ₹${(invoice.total/100 || 0).toFixed(2)}</div>
    </div>

    <hr/>
    <div style="font-size:12px;color:#666">This is a system generated invoice from TurboCompute.</div>
  </body>
  </html>
  `;
  return html;
}

export default function InvoiceView({ invoice, onClose }) {
  const containerRef = useRef();

  const handleDownload = () => {
    // open new window and print that html (works as "save as PDF" in browser)
    const html = renderInvoiceHTML(invoice);
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      alert("Popup blocked. Allow popups for this site to download invoice.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    // small delay to ensure assets loaded
    setTimeout(() => {
      w.print();
      // w.close(); // optional: let user close
    }, 350);
  };

  if (!invoice) return null;

  return (
    <Box ref={containerRef} sx={{ p: 2 }}>
      <Typography variant="h6">Invoice: {invoice.invoice_no}</Typography>
      <Typography color="text.secondary" sx={{ mb: 1 }}>{new Date(invoice.created_at).toLocaleString()}</Typography>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Bill To</Typography>
        <Typography>{invoice.customer?.name}</Typography>
        <Typography color="text.secondary">{invoice.customer?.email}</Typography>
      </Box>

      <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", mb: 2 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Description</th>
            <th style={{ textAlign: "center", padding: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Qty</th>
            <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Rate</th>
            <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.items || []).map((it, i) => (
            <tr key={i}>
              <td style={{ padding: 8 }}>{it.desc}</td>
              <td style={{ padding: 8, textAlign: "center" }}>{it.qty}</td>
              <td style={{ padding: 8, textAlign: "right" }}>₹{(it.rate/100).toFixed(2)}</td>
              <td style={{ padding: 8, textAlign: "right" }}>₹{(it.amount/100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </Box>

      <Box sx={{ textAlign: "right", mb: 2 }}>
        <Typography>Subtotal: ₹{(invoice.subtotal/100 || 0).toFixed(2)}</Typography>
        <Typography>Tax: ₹{(invoice.tax/100 || 0).toFixed(2)}</Typography>
        <Typography variant="h6">Total: ₹{(invoice.total/100 || 0).toFixed(2)}</Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="contained" onClick={handleDownload}>Download / Print</Button>
        {onClose && <Button variant="outlined" onClick={onClose}>Close</Button>}
      </Box>
    </Box>
  );
}
