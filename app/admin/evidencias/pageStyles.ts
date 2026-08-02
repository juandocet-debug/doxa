import type React from 'react';

export const C = {
  bg:            'linear-gradient(135deg, #020604 0%, #06110a 52%, #0b2214 100%)',
  surface:       'rgba(4,10,6,0.92)',
  surfaceBorder: 'rgba(16,185,129,0.22)',
  filter:        'rgba(3,8,5,0.8)',
  filterBorder:  'rgba(255,255,255,0.1)',
  ghost:         'rgba(255,255,255,0.06)',
  ghostBorder:   'rgba(255,255,255,0.1)',
  input:         'rgba(255,255,255,0.04)',
  inputBorder:   'rgba(255,255,255,0.08)',
  lime:          '#10B981',
  textPrimary:   '#F2FFF6',
  textMuted:     '#9CB0A4',
  rowBorder:     'rgba(255,255,255,0.06)',
  errorBg:       'rgba(239, 68, 68, 0.12)',
  errorBorder:   'rgba(239, 68, 68, 0.28)',
  errorText:     '#FCA5A5',
  previewBg:     'rgba(1,4,2,0.97)',
};

export const sBtn = (active = false): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '0 14px',
  minHeight: 34,
  borderRadius: 8,
  border: `1px solid ${C.ghostBorder}`,
  background: active ? C.lime : C.ghost,
  color: active ? '#130620' : C.textPrimary,
  fontWeight: 700,
  fontSize: '0.78rem',
  cursor: 'pointer',
});

export const primaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 14px',
  minHeight: 32,
  borderRadius: 8,
  border: 'none',
  background: C.lime,
  color: '#130620',
  fontWeight: 850,
  fontSize: '0.78rem',
  cursor: 'pointer',
};
