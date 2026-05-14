import React from 'react';
import { Coffee, Mail, Briefcase, MessageCircle, X as CloseIcon } from 'lucide-react';

export type PageType = 'privacy' | 'about' | 'support' | 'contact' | 'collaborate' | null;

const BuyMeACoffee = () => (
  <a
    href="https://www.buymeacoffee.com/"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      background: '#FFDD00',
      color: '#000000',
      padding: '0.8rem 1.5rem',
      borderRadius: '12px',
      fontWeight: 600,
      textDecoration: 'none',
      boxShadow: '0 4px 14px rgba(255, 221, 0, 0.2)',
      transition: 'transform 0.2s',
      marginTop: '1rem',
    }}
  >
    <Coffee size={20} /> Buy me a coffee
  </a>
);

export function PageModal({ page, onClose }: { page: PageType; onClose: () => void }) {
  if (!page) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#1e293b',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '650px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2.5rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '50%',
            display: 'flex',
          }}
        >
          <CloseIcon size={20} />
        </button>

        <div style={{ color: '#e2e8f0', lineHeight: 1.6 }}>
          {page === 'privacy' && <PrivacyPolicy />}
          {page === 'about' && <AboutUs />}
          {page === 'support' && <Support />}
          {page === 'contact' && <Contact />}
          {page === 'collaborate' && <Collaborate />}
        </div>
      </div>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: '#f8fafc' }}>Privacy Policy</h2>
      <p style={{ marginBottom: '1rem', color: '#cbd5e1' }}>
        At <strong>Schemo</strong>, your privacy and data security are our top priority. We believe in transparency and building tools that respect our users.
      </p>
      <h3 style={{ fontSize: '1.2rem', margin: '1.5rem 0 0.8rem', color: '#e2e8f0' }}>1. Data Collection</h3>
      <p style={{ marginBottom: '1rem', color: '#cbd5e1' }}>
        Schemo is a stateless, client-side visualization tool. <strong>We do not collect, store, or sell any personal data.</strong> All mathematical computations and graph renderings happen directly in your browser.
      </p>
      <h3 style={{ fontSize: '1.2rem', margin: '1.5rem 0 0.8rem', color: '#e2e8f0' }}>2. Cookies & Tracking</h3>
      <p style={{ marginBottom: '1rem', color: '#cbd5e1' }}>
        We do not use tracking cookies or third-party analytics scripts that profile your behavior. We only rely on standard, anonymous edge analytics provided by our hosting provider (Cloudflare) to monitor server health and bandwidth usage.
      </p>
      <h3 style={{ fontSize: '1.2rem', margin: '1.5rem 0 0.8rem', color: '#e2e8f0' }}>3. AI Integrations</h3>
      <p style={{ marginBottom: '1rem', color: '#cbd5e1' }}>
        When using Schemo via Claude Desktop or ChatGPT, the transfer function equations you generate are processed ephemerally by our backend API solely to generate the visual plot and dashboard URL. We do not log or store the equations you analyze.
      </p>
      <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#94a3b8' }}>
        Last updated: May 2026
      </p>
    </>
  );
}

function AboutUs() {
  return (
    <>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: '#f8fafc' }}>About Schemo</h2>
      <p style={{ marginBottom: '1rem', color: '#cbd5e1', fontSize: '1.1rem' }}>
        Schemo was built to solve a simple problem: making engineering visualizations frictionless.
      </p>
      <p style={{ marginBottom: '1rem', color: '#cbd5e1' }}>
        Traditionally, viewing a Bode plot, Step Response, or Root Locus required firing up MATLAB, writing Python scripts, or using clunky legacy software. Schemo brings these complex control system computations directly to the web and AI assistants like Claude and ChatGPT.
      </p>
      <p style={{ marginBottom: '2rem', color: '#cbd5e1' }}>
        Whether you're an electrical engineering student cramming for a controls exam, or a professional tweaking a PID controller, Schemo is designed to give you instant, interactive, and beautiful insights.
      </p>
      <div style={{ textAlign: 'center', marginTop: '2.5rem', padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#e2e8f0' }}>Help Keep Schemo Running</h4>
        <p style={{ marginBottom: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
          Server hosting and API maintenance costs add up. If you found this tool helpful for your studies or work, consider supporting the project!
        </p>
        <BuyMeACoffee />
      </div>
    </>
  );
}

function Support() {
  return (
    <>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: '#f8fafc' }}>Support & Help</h2>
      
      <h3 style={{ fontSize: '1.2rem', margin: '1.5rem 0 0.8rem', color: '#e2e8f0' }}>How to use Schemo</h3>
      <p style={{ marginBottom: '1rem', color: '#cbd5e1' }}>
        The easiest way to use Schemo is through <strong>Claude Desktop</strong> or <strong>ChatGPT</strong>. Simply ask the AI to "Plot the step response for H(s) = 100 / (s² + 10s + 100)" and it will automatically generate the plot and provide a link to this dashboard.
      </p>
      
      <h3 style={{ fontSize: '1.2rem', margin: '1.5rem 0 0.8rem', color: '#e2e8f0' }}>Manual Entry</h3>
      <p style={{ marginBottom: '1rem', color: '#cbd5e1' }}>
        You can manually edit equations by clicking the large equation text at the top of the dashboard. This opens our visual Polynomial Builder.
      </p>

      <div style={{ textAlign: 'center', marginTop: '3rem', padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#e2e8f0' }}>Support the Developer</h4>
        <p style={{ marginBottom: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
          If you need further assistance or just want to support the continued development of Schemo, I'd deeply appreciate a coffee!
        </p>
        <BuyMeACoffee />
      </div>
    </>
  );
}

function Contact() {
  return (
    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: '#f8fafc' }}>Contact Me</h2>
      <p style={{ marginBottom: '2rem', color: '#cbd5e1', fontSize: '1.1rem' }}>
        Have questions, feedback, or found a bug? I'd love to hear from you.
      </p>
      
      <a
        href="mailto:sohampawar1866@gmail.com"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.8rem',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: '#ffffff',
          padding: '1rem 2rem',
          borderRadius: '16px',
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: '1.1rem',
          boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)',
          transition: 'transform 0.2s',
        }}
      >
        <Mail size={24} />
        sohampawar1866@gmail.com
      </a>
    </div>
  );
}

function Collaborate() {
  return (
    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: '#f8fafc' }}>Let's Collaborate</h2>
      <p style={{ marginBottom: '2.5rem', color: '#cbd5e1', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto 2.5rem' }}>
        I'm always open to open-source contributions, exciting new projects, and networking with fellow engineers and developers. Let's connect!
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        <a
          href="mailto:sohampawar1866@gmail.com"
          style={{
            display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '350px',
            background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '1rem 1.5rem',
            borderRadius: '16px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)',
            transition: 'background 0.2s'
          }}
        >
          <Mail size={24} color="#f472b6" />
          <span style={{ fontWeight: 500 }}>Email Me</span>
        </a>
        
        <a
          href="https://www.linkedin.com/in/sohampawar1866/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '350px',
            background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '1rem 1.5rem',
            borderRadius: '16px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)',
            transition: 'background 0.2s'
          }}
        >
          <Briefcase size={24} color="#3b82f6" />
          <span style={{ fontWeight: 500 }}>LinkedIn</span>
        </a>

        <a
          href="https://x.com/SohamPawar1866"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '350px',
            background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '1rem 1.5rem',
            borderRadius: '16px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)',
            transition: 'background 0.2s'
          }}
        >
          <MessageCircle size={24} color="#38bdf8" />
          <span style={{ fontWeight: 500 }}>X (Twitter)</span>
        </a>
      </div>
    </div>
  );
}
