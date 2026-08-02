import { C, sBtn } from '../pageStyles';

interface PaginationControlsProps {
  loading: boolean;
  total: number;
  pageSize: number;
  page: number;
  hasNext: boolean;
  load: (page?: number) => void;
}

export function PaginationControls({ loading, total, pageSize, page, hasNext, load }: PaginationControlsProps) {
  if (loading || total <= pageSize) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24, padding: '12px 0', borderTop: `1px solid ${C.filterBorder}` }}>
      <button
        disabled={page <= 1}
        onClick={() => load(page - 1)}
        style={{ ...sBtn(), minHeight: 32, opacity: page <= 1 ? 0.5 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
      >
        ◀ Anterior
      </button>
      <span style={{ fontSize: '0.8rem', color: C.textMuted }}>
        Página <strong style={{ color: C.textPrimary }}>{page}</strong> de {Math.ceil(total / pageSize)} ({total} envíos en total)
      </span>
      <button
        disabled={!hasNext}
        onClick={() => load(page + 1)}
        style={{ ...sBtn(), minHeight: 32, opacity: !hasNext ? 0.5 : 1, cursor: !hasNext ? 'not-allowed' : 'pointer' }}
      >
        Siguiente ▶
      </button>
    </div>
  );
}
