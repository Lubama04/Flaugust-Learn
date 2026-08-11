import { FileText, FileType } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useExportAssessments } from '@/hooks/useExportAssessments'
import { useToast } from '@/hooks/useToast'

interface ExportModalProps {
  enrollmentId: string
  courseTitle: string
  open: boolean
  onClose: () => void
}

export function ExportModal({ enrollmentId, courseTitle, open, onClose }: ExportModalProps) {
  const { exportAssessments, isLoading } = useExportAssessments()
  const toast = useToast()

  const handleExport = async (format: 'docx' | 'pdf') => {
    try {
      await exportAssessments(enrollmentId, format)
      toast.success(`Export ${format.toUpperCase()} téléchargé`)
      onClose()
    } catch {
      toast.error("Erreur lors de l'export")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exporter mes évaluations</DialogTitle>
          <DialogDescription>{courseTitle}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => handleExport('docx')} disabled={isLoading}>
            <FileText className="h-6 w-6" />
            Word (.docx)
          </Button>
          <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => handleExport('pdf')} disabled={isLoading}>
            <FileType className="h-6 w-6" />
            PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
