import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { Preview } from '../types';

export function usePreviewControls() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [preview?.url]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom(z => Math.min(8, Math.max(0.5, z - e.deltaY * 0.001)));
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setDragging(true);
    dragOrigin.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const dx = (e.clientX - dragOrigin.current.mx) / zoom;
    const dy = (e.clientY - dragOrigin.current.my) / zoom;
    setPan({ x: dragOrigin.current.px + dx, y: dragOrigin.current.py + dy });
  }

  function onMouseUp() {
    setDragging(false);
  }

  return { preview, setPreview, zoom, setZoom, pan, setPan, dragging, onWheel, onMouseDown, onMouseMove, onMouseUp };
}
