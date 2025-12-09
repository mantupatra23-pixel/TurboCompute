import React from "react";
import "./Home.css";

const Home = () => {
  return (
    <main className="tc-home">
      <header className="tc-header">
        <div className="tc-container tc-header-inner">
          <div className="tc-logo">TurboCompute</div>
          <nav className="tc-nav" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#dashboard" className="tc-ghost">Dashboard</a>
            <a href="#launch" className="tc-cta">Launch</a>
          </nav>
        </div>
      </header>

      <section className="tc-hero" role="region" aria-labelledby="hero-title">
        <div className="tc-container tc-hero-inner">
          <div className="tc-hero-left">
            <h1 id="hero-title">Instant cloud compute — GPU & CPU on demand</h1>
            <p className="tc-lead">
              Launch high-performance servers in seconds. Pay hourly, monitor usage,
              auto-topup wallet, get Telegram alerts — built for creators and teams.
            </p>

            <div className="tc-actions">
              <a href="#launch" className="btn btn-primary">Launch Server</a>
              <a href="#pricing" className="btn btn-outline">See Pricing</a>
            </div>

            <ul className="tc-trust">
              <li><strong>5s</strong> avg launch</li>
              <li><strong>99.95%</strong> uptime target</li>
              <li><strong>Secure</strong> payments (Razorpay)</li>
            </ul>
          </div>

          <div className="tc-hero-right" aria-hidden="true">
            <div className="tc-device-mock">
              <div className="mock-screen">
                <div className="mock-topbar">
                  <span className="dot dot-green" /> Running
                </div>
                <div className="mock-body">
                  <div className="mock-ip">IP: 13.125.45.12</div>
                  <div className="mock-stats">
                    <div>CPU <strong>4 / 8</strong></div>
                    <div>GPU <strong>1 / 1</strong></div>
                    <div>RAM <strong>16GB</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="tc-section tc-features">
        <div className="tc-container">
          <h2 className="tc-section-title">What you get</h2>
          <div className="tc-grid">
            <article className="tc-card">
              <h3>Fast provisioning</h3>
              <p>Spin up servers in seconds with prebuilt images optimized for ML and rendering.</p>
            </article>
            <article className="tc-card">
              <h3>Wallet & payments</h3>
              <p>Top-up wallet with Razorpay and set auto-recharge to never run out of credits.</p>
            </article>
            <article className="tc-card">
              <h3>Alerts & automation</h3>
              <p>Telegram alerts, webhooks, and background billing checks keep everything automated.</p>
            </article>
            <article className="tc-card">
              <h3>Secure & auditable</h3>
              <p>Per-instance logs, transactions, and role-based access for teams.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="pricing" className="tc-section tc-pricing">
        <div className="tc-container">
          <h2 className="tc-section-title">Plans</h2>
          <div className="tc-pricing-row">
            <div className="tc-pricing-card">
              <div className="plan-title">Basic</div>
              <div className="plan-price">₹10 / hr</div>
              <ul>
                <li>2 vCPU</li>
                <li>4 GB RAM</li>
                <li>1 GB storage</li>
              </ul>
              <a className="btn btn-outline" href="#launch">Choose</a>
            </div>

            <div className="tc-pricing-card tc-highlight">
              <div className="plan-title">Standard</div>
              <div className="plan-price">₹50 / hr</div>
              <ul>
                <li>4 vCPU + GPU</li>
                <li>16 GB RAM</li>
                <li>50 GB NVMe</li>
              </ul>
              <a className="btn btn-primary" href="#launch">Choose</a>
            </div>

            <div className="tc-pricing-card">
              <div className="plan-title">Pro</div>
              <div className="plan-price">Custom</div>
              <ul>
                <li>High GPU</li>
                <li>Dedicated resources</li>
                <li>Priority support</li>
              </ul>
              <a className="btn btn-outline" href="#contact">Enquire</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="tc-footer">
        <div className="tc-container">
          <div>© {new Date().getFullYear()} TurboCompute — Built for speed</div>
          <div className="tc-footer-links">
            <a href="#privacy">Privacy</a>
            <a href="#tos">TOS</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Home;
