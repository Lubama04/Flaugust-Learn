import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import {
  Bold,
  Italic,
  Strikethrough,
  UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Video,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Quote,
  Code,
  TableIcon,
  Undo,
  Redo,
  Palette,
  Highlighter,
  Trash2,
  Rows,
  Columns,
  Combine,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

// ── Extension taille de police + interligne, greffée sur TextStyle ──
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.fontSize,
        renderHTML: (attrs: { fontSize?: string }) =>
          attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
      },
      lineHeight: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.lineHeight,
        renderHTML: (attrs: { lineHeight?: string }) =>
          attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
      },
    }
  },
})

// ── Extension vidéo intégrée (YouTube/Vimeo), non fournie par TipTap ──
const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  addAttributes() {
    return { src: { default: null } }
  },
  parseHTML() {
    return [{ tag: 'div[data-video-embed]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-video-embed': '', class: 'video-embed' }),
      [
        'iframe',
        {
          src: HTMLAttributes.src,
          frameborder: '0',
          allowfullscreen: 'true',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        },
      ],
    ]
  },
})

function toEmbedUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.trim())
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      const id = url.hostname.includes('youtu.be') ? url.pathname.slice(1) : url.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (url.hostname.includes('vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean).pop()
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
    return null
  } catch {
    return null
  }
}

const FONTS = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Playfair Display', value: '"Playfair Display", serif' },
]
const SIZES = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48]
const LINE_HEIGHTS = [
  { label: 'Simple', value: '1' },
  { label: '1,15', value: '1.15' },
  { label: '1,5', value: '1.5' },
  { label: 'Double', value: '2' },
]
const TEXT_COLORS = ['#1A1A1A', '#7B3415', '#B71C1C', '#1A6B35', '#0B5394', '#6A329F', '#E88930']
const HIGHLIGHT_COLORS = ['#FEF9C3', '#FDE68A', '#BBF7D0', '#BFDBFE', '#FBCFE8', '#FED7AA']

const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const IMAGE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const toast = useToast()
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [tableDialogOpen, setTableDialogOpen] = useState(false)
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Rédigez le contenu de la session...' }),
      CharacterCount,
      Underline,
      FontSize,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Subscript,
      Superscript,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      VideoEmbed,
    ],
    content,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[220px] px-3 py-2 focus:outline-none ' +
          '[&_table]:w-full [&_table]:border-collapse [&_th]:bg-[#7B3415] [&_th]:text-white [&_th]:p-2 ' +
          '[&_td]:border [&_td]:border-gray-200 [&_td]:p-2 [&_tr:nth-child(even)_td]:bg-[#F9F9F9] ' +
          '[&_.video-embed]:relative [&_.video-embed]:aspect-video [&_.video-embed_iframe]:absolute ' +
          '[&_.video-embed_iframe]:inset-0 [&_.video-embed_iframe]:h-full [&_.video-embed_iframe]:w-full [&_.video-embed_iframe]:rounded-lg',
      },
    },
  })

  if (!editor) return null

  const openLinkDialog = () => {
    const previousUrl = editor.getAttributes('link').href as string | undefined
    const { from, to } = editor.state.selection
    setLinkUrl(previousUrl ?? '')
    setLinkText(editor.state.doc.textBetween(from, to, ' '))
    setLinkDialogOpen(true)
  }

  const confirmLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run()
      setLinkDialogOpen(false)
      return
    }
    const href = linkUrl.trim()
    if (linkText.trim()) {
      editor.chain().focus().insertContent(`<a href="${href}" target="_blank" rel="noopener noreferrer">${linkText.trim()}</a>`).run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    }
    setLinkDialogOpen(false)
    setLinkUrl('')
    setLinkText('')
  }

  const handleImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!IMAGE_ALLOWED_TYPES.includes(file.type)) {
      toast.error('Format non autorisé (JPEG, PNG, WebP ou GIF)')
      return
    }
    if (file.size > IMAGE_MAX_BYTES) {
      toast.error('Image trop volumineuse (5 Mo max)')
      return
    }
    setUploadingImage(true)
    try {
      const ext = file.type.split('/')[1]
      const path = `editor-content/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('course-thumbnails').upload(path, file, { contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('course-thumbnails').getPublicUrl(path)
      editor.chain().focus().setImage({ src: data.publicUrl }).run()
      setImageDialogOpen(false)
    } catch {
      toast.error("Erreur lors de l'envoi de l'image")
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const confirmImageUrl = () => {
    if (!imageUrl.trim()) return
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run()
    setImageDialogOpen(false)
    setImageUrl('')
  }

  const confirmVideo = () => {
    const embedUrl = toEmbedUrl(videoUrl)
    if (!embedUrl) {
      toast.error('URL YouTube ou Vimeo non reconnue')
      return
    }
    editor.chain().focus().insertContent({ type: 'videoEmbed', attrs: { src: embedUrl } }).run()
    setVideoDialogOpen(false)
    setVideoUrl('')
  }

  const confirmTable = () => {
    const rows = Math.min(Math.max(tableRows, 1), 10)
    const cols = Math.min(Math.max(tableCols, 1), 10)
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    setTableDialogOpen(false)
  }

  const inTable = editor.isActive('table')

  return (
    <div className="rounded-lg border border-gray-300 bg-white">
      {/* Barre d'outils sticky, 2 lignes. Icônes seules sur mobile, icônes + tooltip natif (title) sur desktop. */}
      <div className="sticky top-0 z-10 space-y-1 rounded-t-lg border-b border-gray-100 bg-white p-2">
        <div className="flex flex-wrap items-center gap-1">
          <select
            title="Police"
            onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
            className="h-8 rounded border border-gray-200 bg-white px-1.5 text-xs text-dark"
            defaultValue=""
          >
            <option value="" disabled>
              Police
            </option>
            {FONTS.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            title="Taille"
            onChange={(e) => editor.chain().focus().setMark('textStyle', { fontSize: `${e.target.value}pt` }).run()}
            className="h-8 rounded border border-gray-200 bg-white px-1.5 text-xs text-dark"
            defaultValue=""
          >
            <option value="" disabled>
              Taille
            </option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <Divider />
          <ToolbarButton title="Gras" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="Italique" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="Barré" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="Souligné" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>

          <Divider />
          <ColorPicker
            title="Couleur du texte"
            icon={<Palette className="h-4 w-4" />}
            colors={TEXT_COLORS}
            onPick={(color) => editor.chain().focus().setColor(color).run()}
          />
          <ColorPicker
            title="Surligneur"
            icon={<Highlighter className="h-4 w-4" />}
            colors={HIGHLIGHT_COLORS}
            onPick={(color) => editor.chain().focus().toggleHighlight({ color }).run()}
          />

          <Divider />
          <ToolbarButton title="Indice" active={editor.isActive('subscript')} onClick={() => editor.chain().focus().toggleSubscript().run()}>
            <SubscriptIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="Exposant" active={editor.isActive('superscript')} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
            <SuperscriptIcon className="h-4 w-4" />
          </ToolbarButton>

          <Divider />
          <ToolbarButton title="Lien" active={editor.isActive('link')} onClick={openLinkDialog}>
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="Image" onClick={() => setImageDialogOpen(true)}>
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="Vidéo" onClick={() => setVideoDialogOpen(true)}>
            <Video className="h-4 w-4" />
          </ToolbarButton>

          <span className="ml-auto hidden text-xs text-gray-400 sm:inline">
            {editor.storage.characterCount.characters()} caractères
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <ToolbarButton title="Aligner à gauche" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="Centrer" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="Aligner à droite" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="Justifier" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
            <AlignJustify className="h-4 w-4" />
          </ToolbarButton>

          <Divider />
          <select
            title="Interligne"
            onChange={(e) => editor.chain().focus().setMark('textStyle', { lineHeight: e.target.value }).run()}
            className="h-8 rounded border border-gray-200 bg-white px-1.5 text-xs text-dark"
            defaultValue=""
          >
            <option value="" disabled>
              Interligne
            </option>
            {LINE_HEIGHTS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>

          <Divider />
          <ToolbarButton title="Liste à puces" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="Liste numérotée" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          <Divider />
          <ToolbarButton title="Citation" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="Code" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
            <Code className="h-4 w-4" />
          </ToolbarButton>

          <Divider />
          <ToolbarButton title="Insérer un tableau" onClick={() => setTableDialogOpen(true)}>
            <TableIcon className="h-4 w-4" />
          </ToolbarButton>
          {inTable && (
            <>
              <ToolbarButton title="Ajouter une ligne" onClick={() => editor.chain().focus().addRowAfter().run()}>
                <Rows className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton title="Ajouter une colonne" onClick={() => editor.chain().focus().addColumnAfter().run()}>
                <Columns className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Fusionner les cellules"
                disabled={!editor.can().mergeCells()}
                onClick={() => editor.chain().focus().mergeCells().run()}
              >
                <Combine className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton title="Supprimer le tableau" onClick={() => editor.chain().focus().deleteTable().run()}>
                <Trash2 className="h-4 w-4" />
              </ToolbarButton>
            </>
          )}

          <span className="ml-auto flex items-center gap-1">
            <ToolbarButton title="Annuler" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
              <Undo className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Refaire" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
              <Redo className="h-4 w-4" />
            </ToolbarButton>
          </span>
        </div>
      </div>

      <EditorContent editor={editor} />

      {/* Dialog Lien */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insérer un lien</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Texte du lien (optionnel)</Label>
              <Input value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Cliquez ici" />
            </div>
            <div className="space-y-1.5">
              <Label>URL</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
            </div>
            <p className="text-xs text-gray-400">Le lien s'ouvre toujours dans un nouvel onglet.</p>
          </div>
          <DialogFooter>
            <Button type="button" onClick={confirmLink}>
              Insérer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Image */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insérer une image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Uploader un fichier</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageFileChange}
                disabled={uploadingImage}
                className="block w-full text-sm text-gray file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-primary"
              />
              {uploadingImage && <p className="text-xs text-gray-400">Envoi en cours...</p>}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="h-px flex-1 bg-gray-100" /> ou <span className="h-px flex-1 bg-gray-100" />
            </div>
            <div className="space-y-1.5">
              <Label>URL externe</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={confirmImageUrl} disabled={!imageUrl.trim()}>
              Insérer l'URL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Vidéo */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insérer une vidéo</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>URL YouTube ou Vimeo</Label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
          </div>
          <DialogFooter>
            <Button type="button" onClick={confirmVideo}>
              Insérer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tableau */}
      <Dialog open={tableDialogOpen} onOpenChange={setTableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insérer un tableau</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Lignes (max 10)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={tableRows}
                onChange={(e) => setTableRows(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Colonnes (max 10)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={tableCols}
                onChange={(e) => setTableCols(Number(e.target.value))}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            La première ligne devient l'en-tête (fond brun), les lignes suivantes alternent gris clair et blanc.
          </p>
          <DialogFooter>
            <Button type="button" onClick={confirmTable}>
              Insérer le tableau
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-gray-200" aria-hidden="true" />
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn('h-8 w-8 p-0', active && 'bg-primary/10 text-primary')}
    >
      {children}
    </Button>
  )
}

function ColorPicker({
  title,
  icon,
  colors,
  onPick,
}: {
  title: string
  icon: ReactNode
  colors: string[]
  onPick: (color: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <ToolbarButton title={title} onClick={() => setOpen((o) => !o)}>
        {icon}
      </ToolbarButton>
      {open && (
        <>
          <button
            type="button"
            aria-label="Fermer"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-9 z-20 flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg" style={{ width: 132 }}>
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => {
                  onPick(color)
                  setOpen(false)
                }}
                className="h-6 w-6 rounded border border-gray-200"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
