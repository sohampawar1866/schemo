import { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Pencil, Share2, RefreshCcw, X, Plus, Check, Activity } from 'lucide-react';
import { PageModal, type PageType } from './Pages';
import {
  computeBode,
  computeNyquist,
  computeStep,
  computeImpulse,
  computeRootLocus,
  type BodeData,
  type NyquistData,
  type TimeResponse,
  type RootLocusData,
} from './lib/control';

type PlotType = 'bode' | 'step' | 'impulse' | 'nyquist' | 'root_locus';

const PLOT_LABELS: Record<PlotType, string> = {
  bode: 'Bode Plot',
  step: 'Step Response',
  impulse: 'Impulse Response',
  nyquist: 'Nyquist Plot',
  root_locus: 'Root Locus',
};

function parseCoeffs(str: string): number[] {
  const parts = str.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  const nums = parts.map(Number).filter((n) => !isNaN(n));
  return nums.length > 0 ? nums : [0];
}

function polyToLatex(coeffs: number[]): string {
  const terms: string[] = [];
  for (let i = 0; i < coeffs.length; i++) {
    const c = coeffs[i];
    if (c === 0) continue;
    const power = coeffs.length - 1 - i;
    const absC = Math.abs(c);
    const sign = c < 0 ? '-' : terms.length > 0 ? '+' : '';

    let term = '';
    if (power === 0) {
      term = `${absC}`;
    } else if (power === 1) {
      term = absC === 1 ? 's' : `${absC}s`;
    } else {
      term = absC === 1 ? `s^{${power}}` : `${absC}s^{${power}}`;
    }
    terms.push(`${sign}${term}`);
  }
  return terms.join(' ') || '0';
}

function renderTFLatex(num: number[], den: number[]): string {
  const latex = `H(s) = \\dfrac{${polyToLatex(num)}}{${polyToLatex(den)}}`;
  return katex.renderToString(latex, { throwOnError: false, displayMode: true });
}

// ─── TWEAKER MODAL ──────────────────────────────────────────────

function TweakerModal({
  initialNum,
  initialDen,
  onApply,
  onClose,
}: {
  initialNum: number[];
  initialDen: number[];
  onApply: (n: number[], d: number[]) => void;
  onClose: () => void;
}) {
  const [numStr, setNumStr] = useState<string>(initialNum.join(', '));
  const [denStr, setDenStr] = useState<string>(initialDen.join(', '));

  const parsedNum = useMemo(() => parseCoeffs(numStr), [numStr]);
  const parsedDen = useMemo(() => parseCoeffs(denStr), [denStr]);

  const tfHtml = useMemo(() => renderTFLatex(parsedNum, parsedDen), [parsedNum, parsedDen]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="tweaker-modal" style={{
        background: '#1e293b', borderRadius: '24px', width: '100%', maxWidth: '500px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="text-modal-heading" style={{ color: '#e2e8f0' }}>
            <Pencil size={20} color="#a78bfa" /> Tweak Equation
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }}><X size={24} /></button>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem 1rem', borderRadius: '12px', marginBottom: '2rem', overflowX: 'auto', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ color: '#c8d6e5', fontSize: '1.3rem', textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: tfHtml }} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>NUMERATOR COEFFICIENTS</label>
          <input
            type="text"
            value={numStr}
            onChange={(e) => setNumStr(e.target.value)}
            placeholder="e.g. 100"
            style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '1.05rem', outline: 'none', fontFamily: 'monospace' }}
          />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>DENOMINATOR COEFFICIENTS</label>
          <input
            type="text"
            value={denStr}
            onChange={(e) => setDenStr(e.target.value)}
            placeholder="e.g. 1, 10, 100"
            style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '1.05rem', outline: 'none', fontFamily: 'monospace' }}
          />
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: '12px', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#93c5fd', fontWeight: 600 }}>How it works (Polynomial Form)</p>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              Enter array coefficients for decreasing powers of <strong>s</strong>. <br/>
              Example: entering <code style={{ color: '#fde047', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>1, 5, 6</code> mathematically creates <strong>s² + 5s + 6</strong>.
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
              <em>Note: Linear control systems rely on rational polynomials in s. Non-linear terms like ln(s) or sin(s) cannot be analyzed with LTI tools like Bode or Root Locus.</em>
            </p>
          </div>
        </div>

        <button onClick={() => onApply(parsedNum, parsedDen)} style={{
          width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
          fontWeight: 600, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)', transition: 'transform 0.2s'
        }}>
          Update Plot
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────

function App() {
  const [params, setParams] = useState(() => new URLSearchParams(window.location.search));
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isEmptyURL = !params.has('system') && !params.has('num') && !params.has('den');

  const plotType = (params.get('system') as PlotType) || 'step';
  const num = parseCoeffs(params.get('num') || '100');
  const den = parseCoeffs(params.get('den') || '1,10,100');

  const [activePlot, setActivePlot] = useState<PlotType>(plotType);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [plotKey, setPlotKey] = useState(0);
  const [activePage, setActivePage] = useState<PageType>(null);

  const tfHtml = useMemo(() => renderTFLatex(num, den), [num, den]);

  // Compute math
  const bode = useMemo(() => computeBode(num, den), [num.toString(), den.toString()]);
  const nyquist = useMemo(() => computeNyquist(num, den), [num.toString(), den.toString()]);
  const step = useMemo(() => computeStep(num, den), [num.toString(), den.toString()]);
  const impulse = useMemo(() => computeImpulse(num, den), [num.toString(), den.toString()]);
  const rlocus = useMemo(() => computeRootLocus(num, den), [num.toString(), den.toString()]);

  useEffect(() => {
    document.title = `Schemo: ${PLOT_LABELS[activePlot]}`;
  }, [activePlot]);

  const updateURL = (newNum: number[], newDen: number[], newPlot: PlotType = activePlot) => {
    const newParams = new URLSearchParams();
    newParams.set('system', newPlot);
    newParams.set('num', newNum.join(','));
    newParams.set('den', newDen.join(','));
    window.history.pushState({}, '', `?${newParams.toString()}`);
    setParams(newParams);
    setActivePlot(newPlot);
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const footerLinks = (
    <footer className="footer-container" style={{
      width: '100%',
      maxWidth: '1200px',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      justifyContent: 'center',
      flexWrap: 'wrap',
      color: '#94a3b8',
      fontSize: '0.9rem'
    }}>
      <button onClick={() => setActivePage('about')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', transition: 'color 0.2s' }}>About Us</button>
      <button onClick={() => setActivePage('contact')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', transition: 'color 0.2s' }}>Contact</button>
      <button onClick={() => setActivePage('support')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', transition: 'color 0.2s' }}>Support</button>
      <button onClick={() => setActivePage('collaborate')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', transition: 'color 0.2s' }}>Collaborate</button>
      <button onClick={() => setActivePage('privacy')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', transition: 'color 0.2s' }}>Privacy & Policy</button>
    </footer>
  );

  if (isEmptyURL) {
    return (
      <div className="app-wrapper" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e2030 0%, #2a1b38 50%, #15323a 100%)', color: '#e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <h1 className="text-hero" style={{ background: 'linear-gradient(90deg, #93c5fd, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            <Activity size={56} color="#93c5fd" style={{ WebkitTextFillColor: 'initial' }} /> Schemo
          </h1>
          <p className="text-subtitle" style={{ color: '#94a3b8', textAlign: 'center', maxWidth: '600px', lineHeight: 1.6 }}>
            The professional visualization engine for control systems. Explore interactive Bode, Nyquist, and Root Locus plots directly in your browser, or generate them instantly via Claude and ChatGPT.
          </p>
          
          <div className="box-pad" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: '600px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#e2e8f0', fontSize: '1.2rem', fontWeight: 600 }}>Explore example systems</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button className="btn-pad" onClick={() => updateURL([100], [1, 10, 100], 'step')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '1.05rem', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <strong style={{ fontWeight: 600 }}>Standard 2nd Order System</strong> 
                <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontFamily: 'monospace' }}>H(s) = 100 / (s² + 10s + 100)</span>
              </button>
              <button className="btn-pad" onClick={() => updateURL([1], [1, 1], 'bode')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '1.05rem', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <strong style={{ fontWeight: 600 }}>1st Order Low-Pass Filter</strong> 
                <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontFamily: 'monospace' }}>H(s) = 1 / (s + 1)</span>
              </button>
              <button className="btn-pad" onClick={() => updateURL([1], [1, 0.2, 1], 'step')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '1.05rem', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <strong style={{ fontWeight: 600 }}>Underdamped Resonator</strong> 
                <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontFamily: 'monospace' }}>H(s) = 1 / (s² + 0.2s + 1)</span>
              </button>
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button className="btn-pad-lg" onClick={() => setIsEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', borderRadius: '16px', border: 'none', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)', transition: 'transform 0.2s' }}>
                <Pencil size={18} /> Or create your own equation
              </button>
            </div>
          </div>
        </div>
        
        {footerLinks}
        
        {isEditing && <TweakerModal initialNum={num} initialDen={den} onClose={() => setIsEditing(false)} onApply={(n, d) => { updateURL(n, d); setIsEditing(false); }} />}
        <PageModal page={activePage} onClose={() => setActivePage(null)} />
      </div>
    );
  }

  return (
    <div className="app-wrapper" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e2030 0%, #2a1b38 50%, #15323a 100%)',
      color: '#e2e8f0',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Header & Equation */}
      <header style={{ textAlign: 'center', marginBottom: '1.5rem', width: '100%', maxWidth: '1000px' }}>
        <div className="header-top">
          <h1 className="text-heading" style={{ background: 'linear-gradient(90deg, #93c5fd, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            <Activity size={26} color="#93c5fd" style={{ WebkitTextFillColor: 'initial' }} /> Schemo
          </h1>
          <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '20px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}>
            {copied ? <Check size={16} color="#10b981"/> : <Share2 size={16} />}
            {copied ? 'Copied!' : 'Share Link'}
          </button>
        </div>
        
        {/* Clickable Equation */}
        <div 
          onClick={() => setIsEditing(true)}
          className="equation-hover equation-box"
          style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '1rem',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
          }}
        >
          <div className="equation-text" dangerouslySetInnerHTML={{ __html: tfHtml }} />
          <div className="edit-icon" style={{ color: '#a78bfa', opacity: 0.7, padding: '0.5rem', background: 'rgba(167, 139, 250, 0.1)', borderRadius: '50%' }}>
            <Pencil size={20} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-card" style={{
        width: '100%',
        maxWidth: '1200px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      }}>
        {/* Top bar inside the card: Tabs + Reset */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          
          <nav className="plot-tabs">
            {(Object.keys(PLOT_LABELS) as PlotType[]).map((pt) => (
              <button
                key={pt}
                onClick={() => { setActivePlot(pt); updateURL(num, den, pt); }}
                style={{
                  padding: '0.6rem 1.2rem', borderRadius: '12px', border: 'none', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
                  background: activePlot === pt ? '#3b82f6' : 'transparent',
                  color: activePlot === pt ? '#fff' : '#94a3b8',
                }}
              >
                {PLOT_LABELS[pt]}
              </button>
            ))}
          </nav>

          <button 
            onClick={() => setPlotKey(k => k + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.08)', border: 'none', padding: '0.5rem 1rem', borderRadius: '12px', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            <RefreshCcw size={16} /> Reset View
          </button>
        </div>

        {/* Dynamic Plot */}
        <div key={plotKey} style={{ position: 'relative', width: '100%', minHeight: isMobile ? '400px' : '600px' }}>
          {activePlot === 'bode' && <BodePlotView data={bode} isMobile={isMobile} />}
          {activePlot === 'step' && <TimeResponseView data={step} title="Step Response" color="#3b82f6" isMobile={isMobile} />}
          {activePlot === 'impulse' && <TimeResponseView data={impulse} title="Impulse Response" color="#ef4444" isMobile={isMobile} />}
          {activePlot === 'nyquist' && <NyquistView data={nyquist} isMobile={isMobile} />}
          {activePlot === 'root_locus' && <RootLocusView data={rlocus} isMobile={isMobile} />}
        </div>
      </main>

      {footerLinks}

      {isEditing && (
        <TweakerModal 
          initialNum={num} 
          initialDen={den} 
          onClose={() => setIsEditing(false)} 
          onApply={(n, d) => { updateURL(n, d); setIsEditing(false); }} 
        />
      )}
      
      <PageModal page={activePage} onClose={() => setActivePage(null)} />
    </div>
  );
}

// ─── PLOT COMPONENTS ──────────────────────────────────────────────

const getDarkLayout = (isMobile: boolean): Partial<Plotly.Layout> => ({
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'rgba(0,0,0,0.1)',
  font: { color: '#cbd5e1', family: "'Inter', sans-serif", size: 12 },
  margin: { l: isMobile ? 40 : 60, r: isMobile ? 15 : 30, t: isMobile ? 45 : 70, b: isMobile ? 40 : 50 },
  xaxis: { gridcolor: 'rgba(255,255,255,0.04)', zerolinecolor: 'rgba(255,255,255,0.15)' },
  yaxis: { gridcolor: 'rgba(255,255,255,0.04)', zerolinecolor: 'rgba(255,255,255,0.15)' },
});

const PLOT_CONFIG: Partial<Plotly.Config> = {
  displayModeBar: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'sendDataToCloud', 'zoom2d', 'pan2d'],
  displaylogo: false,
  responsive: true,
};

function BodePlotView({ data, isMobile }: { data: BodeData, isMobile: boolean }) {
  const freqHz = data.omega.map((w) => w / (2 * Math.PI));
  const baseLayout = getDarkLayout(isMobile);
  return (
    <div>
      <Plot
        data={[{ x: freqHz, y: data.magnitude_db, type: 'scatter', mode: 'lines', name: 'Magnitude', line: { color: '#38bdf8', width: 2.5 } }]}
        layout={{ ...baseLayout, title: { text: 'Magnitude', font: { size: 14, color: '#e2e8f0' } }, xaxis: { ...baseLayout.xaxis, type: 'log', title: 'Frequency (Hz)' }, yaxis: { ...baseLayout.yaxis, title: 'Magnitude (dB)' }, height: 350 } as any}
        config={PLOT_CONFIG} useResizeHandler style={{ width: '100%' }}
      />
      <Plot
        data={[{ x: freqHz, y: data.phase_deg, type: 'scatter', mode: 'lines', name: 'Phase', line: { color: '#f472b6', width: 2.5 } }]}
        layout={{ ...baseLayout, title: { text: 'Phase', font: { size: 14, color: '#e2e8f0' } }, xaxis: { ...baseLayout.xaxis, type: 'log', title: 'Frequency (Hz)' }, yaxis: { ...baseLayout.yaxis, title: 'Phase (°)' }, height: 350 } as any}
        config={PLOT_CONFIG} useResizeHandler style={{ width: '100%' }}
      />
    </div>
  );
}

function TimeResponseView({ data, title, color, isMobile }: { data: TimeResponse; title: string; color: string, isMobile: boolean }) {
  const baseLayout = getDarkLayout(isMobile);
  return (
    <Plot
      data={[{ x: data.time, y: data.amplitude, type: 'scatter', mode: 'lines', name: title, line: { color, width: 2.5 }, fill: 'tozeroy', fillcolor: `${color}15` }]}
      layout={{ ...baseLayout, xaxis: { ...baseLayout.xaxis, title: 'Time (seconds)' }, yaxis: { ...baseLayout.yaxis, title: 'Amplitude' }, height: isMobile ? 400 : 600 } as any}
      config={PLOT_CONFIG} useResizeHandler style={{ width: '100%' }}
    />
  );
}

function NyquistView({ data, isMobile }: { data: NyquistData, isMobile: boolean }) {
  const baseLayout = getDarkLayout(isMobile);
  return (
    <Plot
      data={[
        { x: data.real, y: data.imag, type: 'scatter', mode: 'lines', name: 'H(jω)', line: { color: '#a855f7', width: 2.5 } },
        { x: data.real, y: data.imag.map((v) => -v), type: 'scatter', mode: 'lines', name: 'H(−jω)', line: { color: '#a855f7', width: 1.5, dash: 'dash' }, opacity: 0.6 },
        { x: [-1], y: [0], type: 'scatter', mode: 'markers', name: '−1 point', marker: { color: '#ef4444', size: 12, symbol: 'x' } },
      ]}
      layout={{ ...baseLayout, xaxis: { ...baseLayout.xaxis, title: 'Real', scaleanchor: 'y' }, yaxis: { ...baseLayout.yaxis, title: 'Imaginary' }, height: isMobile ? 400 : 650 } as any}
      config={PLOT_CONFIG} useResizeHandler style={{ width: '100%' }}
    />
  );
}

function RootLocusView({ data, isMobile }: { data: RootLocusData, isMobile: boolean }) {
  const baseLayout = getDarkLayout(isMobile);
  const nRoots = data.roots[0]?.length || 0;
  const traces: any[] = [];
  for (let r = 0; r < nRoots; r++) {
    traces.push({ x: data.roots.map((roots) => roots[r]?.re ?? 0), y: data.roots.map((roots) => roots[r]?.im ?? 0), type: 'scatter', mode: 'lines', name: `Branch ${r + 1}`, line: { width: 2.5 }, showlegend: r < 6 });
  }
  if (data.roots.length > 0) {
    const poles = data.roots[0];
    traces.push({ x: poles.map((p) => p.re), y: poles.map((p) => p.im), type: 'scatter', mode: 'markers', name: 'Open-loop poles', marker: { color: '#ef4444', size: 12, symbol: 'x' } });
  }
  return (
    <Plot
      data={traces}
      layout={{ ...baseLayout, xaxis: { ...baseLayout.xaxis, title: 'Real Axis', scaleanchor: 'y' }, yaxis: { ...baseLayout.yaxis, title: 'Imaginary Axis' }, height: isMobile ? 400 : 650 } as any}
      config={PLOT_CONFIG} useResizeHandler style={{ width: '100%' }}
    />
  );
}

export default App;
