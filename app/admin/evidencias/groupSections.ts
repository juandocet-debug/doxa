import type { SubmisionEvidencia } from './types';

function sortByNewest(items: SubmisionEvidencia[]) {
  return [...items].sort((a, b) => new Date(b.fechaEnvio).getTime() - new Date(a.fechaEnvio).getTime());
}

function sortByClassNumber(a: { clase: string }, b: { clase: string }) {
  const an = Number(a.clase.replace(/\D/g, '')) || 999;
  const bn = Number(b.clase.replace(/\D/g, '')) || 999;
  return an - bn;
}

export function buildGroupSections(submissions: SubmisionEvidencia[]) {
  const groups = new Map<string, SubmisionEvidencia[]>();
  for (const sub of submissions) {
    const groupName = sub.grupo || 'Sin grupo';
    const items = groups.get(groupName) ?? [];
    items.push(sub);
    groups.set(groupName, items);
  }

  return Array.from(groups.entries())
    .map(([grupo, groupItems]) => {
      const classMap = new Map<string, SubmisionEvidencia[]>();
      for (const sub of groupItems) {
        const items = classMap.get(sub.clase) ?? [];
        items.push(sub);
        classMap.set(sub.clase, items);
      }

      const classes = Array.from(classMap.entries())
        .map(([clase, items]) => {
          const ordered = sortByNewest(items);
          const reviewTotal = ordered.reduce((sum, item) => sum + (item.reviewSummary?.total ?? 0), 0);
          const reviewCumple = ordered.reduce((sum, item) => sum + (item.reviewSummary?.cumple ?? 0), 0);
          const reviewNoCumple = ordered.reduce((sum, item) => sum + (item.reviewSummary?.noCumple ?? 0), 0);
          const reviewPendientes = ordered.reduce((sum, item) => sum + (item.reviewSummary?.pendientes ?? 0), 0);

          return {
            clase,
            codigoClase: ordered[0]?.codigoClase ?? null,
            items: ordered,
            latest: ordered[0],
            count: ordered.length,
            reviewTotal,
            reviewCumple,
            reviewNoCumple,
            reviewPendientes,
            reviewComplete: reviewTotal > 0 && reviewCumple === reviewTotal,
            estado: ordered.some(s => s.estado === 'aprobada')
              ? 'aprobada'
              : ordered.some(s => s.estado === 'rechazada')
                ? 'rechazada'
                : 'pendiente',
            backupStatus: ordered.some(s => s.backupStatus === 'failed')
              ? 'failed'
              : ordered.every(s => s.backupStatus === 'synced' || s.backupStatus === 'empty')
                ? 'synced'
                : ordered.some(s => s.backupStatus === 'synced' || s.backupStatus === 'partial')
                  ? 'partial'
                  : 'pending',
          };
        })
        .sort(sortByClassNumber);

      const orderedItems = sortByNewest(groupItems);
      return {
        grupo,
        classes,
        items: orderedItems,
        latest: orderedItems[0],
        total: orderedItems.length,
      };
    })
    .sort((a, b) => a.grupo.localeCompare(b.grupo, 'es'));
}
