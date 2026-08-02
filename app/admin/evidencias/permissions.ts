import { COMPONENTES } from '@/lib/componentes';
import type { SessionComp } from './types';

export function getEvidencePermissions(session: SessionComp | null, selectedCompId: string) {
  const isSuperAdmin = session?.isSuperAdmin === true;
  const isSuperCoordinador = session?.isSuperCoordinador === true;
  const puedeEliminarClases = isSuperAdmin || session?.puedeEliminarClases === true;
  const userPerm = session?.permisos?.find(p => p.componenteId === selectedCompId);

  const puedeVer = isSuperAdmin || !!userPerm?.puedeVer;
  const puedeRevisarEvidencia = isSuperAdmin || (puedeVer && (isSuperCoordinador || !!userPerm?.puedeRevisarEvidencia));
  const puedeAprobar = isSuperAdmin || puedeRevisarEvidencia || !!userPerm?.puedeAprobar;
  const puedeDevolver = isSuperAdmin || puedeRevisarEvidencia || !!userPerm?.puedeDevolver;
  const puedeReemplazar = isSuperAdmin || !!userPerm?.puedeReemplazar;
  const puedeEliminarEvidencia = isSuperAdmin || !!userPerm?.puedeEliminarEvidencia;
  const puedeSincronizarBackup = isSuperAdmin || !!userPerm?.puedeSincronizarBackup;
  const puedeExportar = isSuperAdmin || !!userPerm?.puedeExportar;
  const isReadOnly = !puedeAprobar && !puedeDevolver && !puedeReemplazar && !puedeEliminarEvidencia && !puedeSincronizarBackup;
  const currentComp = COMPONENTES.find(c => c.id === selectedCompId) ?? null;

  return {
    isSuperAdmin,
    isSuperCoordinador,
    puedeEliminarClases,
    puedeVer,
    puedeRevisarEvidencia,
    puedeAprobar,
    puedeDevolver,
    puedeReemplazar,
    puedeEliminarEvidencia,
    puedeSincronizarBackup,
    puedeExportar,
    isReadOnly,
    currentComp,
  };
}
