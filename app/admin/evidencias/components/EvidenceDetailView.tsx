import { DetailCard } from './EvidenciaCard';
import type { buildGroupSections } from '../groupSections';
import type { UseEvidenciasReturn } from '../hooks/useEvidencias';
import { C, sBtn } from '../pageStyles';

type GroupSections = ReturnType<typeof buildGroupSections>;

interface EvidenceDetailViewProps {
  state: UseEvidenciasReturn;
  groupSections: GroupSections;
}

export function EvidenceDetailView({ state, groupSections }: EvidenceDetailViewProps) {
  const {
    filterClase,
    setFilterClase,
    submissions: filtered,
    puedeExportar,
    puedeSincronizarBackup,
    puedeEliminarClases,
    puedeRevisarEvidencia,
    puedeReemplazar,
    puedeEliminarEvidencia,
    uploadingDrive,
    syncingBackup,
    deletingFile,
    updatingFechaReal,
    preview,
    setPreview,
    setReemplazarModal,
    setReemplazarMotivo,
    setReemplazarFile,
    setReemplazarFilePreview,
    setManualUploadModal,
    setManualUploadLabel,
    setManualUploadMotivo,
    setManualUploadFile,
    setManualUploadFilePreview,
    handleUploadToDrive,
    handleSyncBackup,
    handleDeleteEvidenceFile,
    handleReviewEvidenceFile,
    handleUpdateFechaReal,
    handleDeleteSubmission,
    loadedFiles,
    loadingFiles,
    fetchFilesForSubmission,
  } = state;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 4px', color: C.lime, fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Clase seleccionada</p>
          <h2 style={{ margin: 0, color: C.textPrimary, fontSize: '1.05rem', fontWeight: 850 }}>{filterClase}</h2>
          <p style={{ margin: '4px 0 0', color: C.textMuted, fontSize: '0.76rem' }}>
            {filtered.length} envio{filtered.length !== 1 ? 's' : ''} organizado{filtered.length !== 1 ? 's' : ''} por grupo.
          </p>
        </div>
      </div>
      {groupSections.map((section, sectionIndex) => (
        <section key={section.grupo} style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 2px' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: '0 0 3px', color: C.lime, fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Grupo</p>
              <h3 style={{ margin: 0, color: C.textPrimary, fontSize: '0.95rem', fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{section.grupo}</h3>
            </div>
            <span style={{ color: C.textMuted, fontSize: '0.72rem', flexShrink: 0 }}>{section.total} envio{section.total !== 1 ? 's' : ''}</span>
          </div>
          {section.items.map((sub, index) => {
            const zipName = [sub.componenteNombre, sub.grupo, sub.clase]
              .map(s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 25))
              .join('__');
            const defaultOpen = sectionIndex === 0 && index === 0;
            return (
              <DetailCard
                key={`${sub.submissionId}:${defaultOpen ? 'open' : 'closed'}:${sub.fechaActividadReal ?? ''}`}
                sub={sub}
                puedeExportar={puedeExportar}
                puedeSincronizarBackup={puedeSincronizarBackup}
                puedeAprobar={puedeEliminarClases}
                puedeRevisarEvidencia={puedeRevisarEvidencia}
                puedeReemplazar={puedeReemplazar}
                puedeEliminarEvidencia={puedeEliminarEvidencia}
                uploadingDrive={uploadingDrive}
                syncingBackup={syncingBackup}
                deletingFile={deletingFile}
                updatingFechaReal={updatingFechaReal}
                preview={preview}
                setPreview={setPreview}
                setReemplazarModal={setReemplazarModal}
                setReemplazarMotivo={setReemplazarMotivo}
                setReemplazarFile={setReemplazarFile}
                setReemplazarFilePreview={setReemplazarFilePreview}
                setManualUploadModal={setManualUploadModal}
                setManualUploadLabel={setManualUploadLabel}
                setManualUploadMotivo={setManualUploadMotivo}
                setManualUploadFile={setManualUploadFile}
                setManualUploadFilePreview={setManualUploadFilePreview}
                handleUploadToDrive={handleUploadToDrive}
                handleSyncBackup={handleSyncBackup}
                handleDeleteEvidenceFile={handleDeleteEvidenceFile}
                handleReviewEvidenceFile={handleReviewEvidenceFile}
                handleUpdateFechaReal={handleUpdateFechaReal}
                handleDeleteSubmission={handleDeleteSubmission}
                setFilterClase={setFilterClase}
                sBtn={sBtn}
                zipName={zipName}
                C={C}
                loadedFiles={loadedFiles}
                loadingFiles={loadingFiles}
                fetchFilesForSubmission={fetchFilesForSubmission}
                defaultOpen={defaultOpen}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
}
