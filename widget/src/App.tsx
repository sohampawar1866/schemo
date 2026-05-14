import { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
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
  return str.split(',').map(Number).filter((n) => !isNaN(n));
}

function formatTF(num: number[], den: number[]): string {
  const fmt = (coeffs: number[]) =>
    coeffs
      .map((c, i) => {
        const power = coeffs.length - 1 - i;
        const coeff = Math.abs(c);
        const sign = c < 0 ? '−' : i > 0 ? '+' : '';
        if (power === 0) return `${sign} ${coeff}`;
        if (power === 1) return `${sign} ${coeff === 1 ? '' : coeff}s`;
        return `${sign} ${coeff === 1 ? '' : coeff}s^${power}`;
      })
      .join(' ')
      .trim();
  return `H(s) = (${fmt(num)}) / (${fmt(den)})`;
}

function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  const plotType = (params.get('system') as PlotType) || 'bode';
  const num = parseCoeffs(params.get('num') || '1');
  const den = parseCoeffs(params.get('den') || '1,1');

  const [activePlot, setActivePlot] = useState<PlotType>(plotType);

  // Compute all plot data client-side
  const bode = useMemo(() => computeBode(num, den), [num.toString(), den.toString()]);
  const nyquist = useMemo(() => computeNyquist(num, den), [num.toString(), den.toString()]);
  const step = useMemo(() => computeStep(num, den), [num.toString(), den.toString()]);
  const impulse = useMemo(() => computeImpulse(num, den), [num.toString(), den.toString()]);
  const rlocus = useMemo(() => computeRootLocus(num, den), [num.toString(), den.toString()]);

  useEffect(() => {
    document.title = `Schemo: ${PLOT_LABELS[activePlot]}`;
  }, [activePlot]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#e2e8f0',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: '1.5rem',
    }}>
      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{
          fontSize: '1.8rem',
          fontWeight: 700,
          background: 'linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 0.4rem 0',
        }}>
          Schemo
        </h1>
        <p style={{
          color: '#94a3b8',
          fontSize: '0.85rem',
          margin: 0,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {formatTF(num, den)}
        </p>
      </header>

      {/* Tab Bar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '0.4rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}>
        {(Object.keys(PLOT_LABELS) as PlotType[]).map((pt) => (
          <button
            key={pt}
            onClick={() => setActivePlot(pt)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activePlot === pt
                ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                : 'rgba(255,255,255,0.06)',
              color: activePlot === pt ? '#fff' : '#94a3b8',
              boxShadow: activePlot === pt ? '0 4px 15px rgba(59,130,246,0.3)' : 'none',
            }}
          >
            {PLOT_LABELS[pt]}
          </button>
        ))}
      </nav>

      {/* Plot Area */}
      <main style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '1rem',
        backdropFilter: 'blur(10px)',
      }}>
        {activePlot === 'bode' && <BodePlotView data={bode} />}
        {activePlot === 'step' && <TimeResponseView data={step} title="Step Response" color="#3b82f6" />}
        {activePlot === 'impulse' && <TimeResponseView data={impulse} title="Impulse Response" color="#ef4444" />}
        {activePlot === 'nyquist' && <NyquistView data={nyquist} />}
        {activePlot === 'root_locus' && <RootLocusView data={rlocus} />}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', marginTop: '1.5rem', color: '#475569', fontSize: '0.75rem' }}>
        Powered by Schemo MCP Server · All math computed client-side
      </footer>
    </div>
  );
}

// ─── Plot Components ─────────────────────────────────────────

const DARK_LAYOUT: Partial<Plotly.Layout> = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'rgba(0,0,0,0.2)',
  font: { color: '#94a3b8', family: "'Inter', sans-serif", size: 12 },
  margin: { l: 60, r: 30, t: 40, b: 50 },
  xaxis: { gridcolor: 'rgba(255,255,255,0.06)', zerolinecolor: 'rgba(255,255,255,0.1)' },
  yaxis: { gridcolor: 'rgba(255,255,255,0.06)', zerolinecolor: 'rgba(255,255,255,0.1)' },
};

const PLOT_CONFIG: Partial<Plotly.Config> = {
  displayModeBar: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'sendDataToCloud'],
  displaylogo: false,
  responsive: true,
};

function BodePlotView({ data }: { data: BodeData }) {
  const freqHz = data.omega.map((w) => w / (2 * Math.PI));
  return (
    <div>
      <Plot
        data={[
          {
            x: freqHz,
            y: data.magnitude_db,
            type: 'scatter',
            mode: 'lines',
            name: 'Magnitude',
            line: { color: '#3b82f6', width: 2 },
          },
        ]}
        layout={{
          ...DARK_LAYOUT,
          title: { text: 'Magnitude', font: { size: 14, color: '#e2e8f0' } },
          xaxis: { ...DARK_LAYOUT.xaxis, type: 'log', title: 'Frequency (Hz)' },
          yaxis: { ...DARK_LAYOUT.yaxis, title: 'Magnitude (dB)' },
          height: 280,
        } as any}
        config={PLOT_CONFIG}
        useResizeHandler
        style={{ width: '100%' }}
      />
      <Plot
        data={[
          {
            x: freqHz,
            y: data.phase_deg,
            type: 'scatter',
            mode: 'lines',
            name: 'Phase',
            line: { color: '#f472b6', width: 2 },
          },
        ]}
        layout={{
          ...DARK_LAYOUT,
          title: { text: 'Phase', font: { size: 14, color: '#e2e8f0' } },
          xaxis: { ...DARK_LAYOUT.xaxis, type: 'log', title: 'Frequency (Hz)' },
          yaxis: { ...DARK_LAYOUT.yaxis, title: 'Phase (°)' },
          height: 280,
        } as any}
        config={PLOT_CONFIG}
        useResizeHandler
        style={{ width: '100%' }}
      />
    </div>
  );
}

function TimeResponseView({ data, title, color }: { data: TimeResponse; title: string; color: string }) {
  return (
    <Plot
      data={[
        {
          x: data.time,
          y: data.amplitude,
          type: 'scatter',
          mode: 'lines',
          name: title,
          line: { color, width: 2 },
          fill: 'tozeroy',
          fillcolor: `${color}15`,
        },
      ]}
      layout={{
        ...DARK_LAYOUT,
        title: { text: title, font: { size: 14, color: '#e2e8f0' } },
        xaxis: { ...DARK_LAYOUT.xaxis, title: 'Time (seconds)' },
        yaxis: { ...DARK_LAYOUT.yaxis, title: 'Amplitude' },
        height: 500,
      } as any}
      config={PLOT_CONFIG}
      useResizeHandler
      style={{ width: '100%' }}
    />
  );
}

function NyquistView({ data }: { data: NyquistData }) {
  return (
    <Plot
      data={[
        {
          x: data.real,
          y: data.imag,
          type: 'scatter',
          mode: 'lines',
          name: 'H(jω)',
          line: { color: '#8b5cf6', width: 2 },
        },
        {
          x: data.real,
          y: data.imag.map((v) => -v),
          type: 'scatter',
          mode: 'lines',
          name: 'H(−jω)',
          line: { color: '#8b5cf6', width: 1, dash: 'dash' },
          opacity: 0.5,
        },
        {
          x: [-1],
          y: [0],
          type: 'scatter',
          mode: 'markers',
          name: '−1 point',
          marker: { color: '#ef4444', size: 10, symbol: 'x' },
        },
      ]}
      layout={{
        ...DARK_LAYOUT,
        title: { text: 'Nyquist Plot', font: { size: 14, color: '#e2e8f0' } },
        xaxis: { ...DARK_LAYOUT.xaxis, title: 'Real', scaleanchor: 'y' },
        yaxis: { ...DARK_LAYOUT.yaxis, title: 'Imaginary' },
        height: 550,
      } as any}
      config={PLOT_CONFIG}
      useResizeHandler
      style={{ width: '100%' }}
    />
  );
}

function RootLocusView({ data }: { data: RootLocusData }) {
  // Flatten roots into traces — one trace per root branch
  const nRoots = data.roots[0]?.length || 0;
  const traces: any[] = [];

  for (let r = 0; r < nRoots; r++) {
    traces.push({
      x: data.roots.map((roots) => roots[r]?.re ?? 0),
      y: data.roots.map((roots) => roots[r]?.im ?? 0),
      type: 'scatter',
      mode: 'lines',
      name: `Branch ${r + 1}`,
      line: { width: 2 },
      showlegend: r < 6,
    });
  }

  // Mark open-loop poles (K=0 → roots of denominator)
  if (data.roots.length > 0) {
    const poles = data.roots[0];
    traces.push({
      x: poles.map((p) => p.re),
      y: poles.map((p) => p.im),
      type: 'scatter',
      mode: 'markers',
      name: 'Open-loop poles',
      marker: { color: '#ef4444', size: 10, symbol: 'x' },
    });
  }

  return (
    <Plot
      data={traces}
      layout={{
        ...DARK_LAYOUT,
        title: { text: 'Root Locus', font: { size: 14, color: '#e2e8f0' } },
        xaxis: { ...DARK_LAYOUT.xaxis, title: 'Real Axis', scaleanchor: 'y' },
        yaxis: { ...DARK_LAYOUT.yaxis, title: 'Imaginary Axis' },
        height: 550,
      } as any}
      config={PLOT_CONFIG}
      useResizeHandler
      style={{ width: '100%' }}
    />
  );
}

export default App;
