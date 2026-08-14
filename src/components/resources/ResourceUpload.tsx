import { useState } from 'react'
import { Upload, Link as LinkIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ResourceUploadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadFile: (params: { title: string; description: string; file: File }) => Promise<unknown>
  onAddLink: (params: { title: string; description: string; url: string }) => Promise<unknown>
  isSubmitting: boolean
}

/** Formulaire d'ajout d'une ressource pédagogique : fichier (PDF, image, doc…) ou lien externe. */
export function ResourceUpload({ open, onOpenChange, onUploadFile, onAddLink, isSubmitting }: ResourceUploadProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')

  const reset = () => {
    setTitle('')
    setDescription('')
    setFile(null)
    setUrl('')
  }

  const handleSubmitFile = async () => {
    if (!title.trim() || !file) return
    await onUploadFile({ title: title.trim(), description: description.trim(), file })
    reset()
    onOpenChange(false)
  }

  const handleSubmitLink = async () => {
    if (!title.trim() || !url.trim()) return
    await onAddLink({ title: title.trim(), description: description.trim(), url: url.trim() })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une ressource</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="resource-title">Titre</Label>
            <Input id="resource-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Guide du module 1" />
          </div>
          <div>
            <Label htmlFor="resource-description">Description (optionnelle)</Label>
            <Textarea
              id="resource-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <Tabs defaultValue="file">
            <TabsList>
              <TabsTrigger value="file">Fichier</TabsTrigger>
              <TabsTrigger value="link">Lien externe</TabsTrigger>
            </TabsList>
            <TabsContent value="file">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
              />
              <p className="mt-1 text-xs text-gray-400">Max 20 Mo, PDF, image, document. Indexable par l'IA du chat.</p>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button onClick={() => void handleSubmitFile()} disabled={!title.trim() || !file || isSubmitting}>
                  <Upload className="mr-1.5 h-4 w-4" /> Ajouter
                </Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="link">
              <Label htmlFor="resource-url">URL</Label>
              <Input id="resource-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
              <p className="mt-1 text-xs text-gray-400">Le contenu de la page sera indexé par l'IA du chat (via Jina Reader).</p>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button onClick={() => void handleSubmitLink()} disabled={!title.trim() || !url.trim() || isSubmitting}>
                  <LinkIcon className="mr-1.5 h-4 w-4" /> Ajouter
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
