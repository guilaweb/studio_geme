import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Profundidade - Sistema Operacional de Inteligência, Investigação e Evidências';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #050b14 0%, #0a192f 50%, #0f2b48 100%)',
          padding: '60px 80px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Background Decorative Rings */}
        <div
          style={{
            position: 'absolute',
            top: '-150px',
            right: '-150px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 102, 255, 0.25) 0%, rgba(0,0,0,0) 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '25%',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(0,0,0,0) 70%)',
          }}
        />

        {/* Top Header: Brand Logo & Tag */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Logo Mark */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #0066ff 0%, #00d2ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0, 102, 255, 0.4)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.5px', color: '#ffffff' }}>
                PROFUNDIDADE
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '2px', color: '#00d2ff', textTransform: 'uppercase' }}>
                Inteligência, Investigação & Perícia Forense
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 20px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '14px',
              fontWeight: '600',
              color: '#93c5fd',
            }}
          >
            Google Cloud Platform Enterprise
          </div>
        </div>

        {/* Central Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '980px' }}>
          <h1
            style={{
              fontSize: '48px',
              fontWeight: '900',
              lineHeight: '1.15',
              letterSpacing: '-1px',
              color: '#ffffff',
              margin: 0,
            }}
          >
            Sistema Operacional Digital de Inteligência & Evidências.
          </h1>
          <p
            style={{
              fontSize: '22px',
              lineHeight: '1.4',
              color: '#94a3b8',
              margin: 0,
              fontWeight: '400',
            }}
          >
            Plataforma segura para gestão de casos complexos, custódia forense SHA-256, análise de vínculos, inteligência de fontes abertas (OSINT) e relatórios periciais selados.
          </p>
        </div>

        {/* Badges / Features Bottom Grid */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', borderTop: '1px solid rgba(255, 255, 255, 0.12)', paddingTop: '28px' }}>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {['Casos Complexos', 'Custódia SHA-256', 'Grafos de Vínculos', 'OSINT & Fontes', 'SI Assistente (GCP)', 'Dossiês Selados'].map((item) => (
              <div
                key={item}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: 'rgba(0, 102, 255, 0.15)',
                  border: '1px solid rgba(0, 102, 255, 0.35)',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#60a5fa',
                }}
              >
                {item}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '15px', fontWeight: '500' }}>
            <span>profundidade.app</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
