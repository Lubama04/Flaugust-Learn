/**
 * Export Excel générique à partir de données déjà issues de la base (jamais de fichier
 * utilisateur uploadé/parsé ici) — le paquet xlsx a des CVE connues côté parsing
 * (prototype pollution / ReDoS, sans correctif sur le registre npm), mais cet usage
 * en écriture seule à partir de données internes de confiance n'expose pas cette surface.
 * Import dynamique : xlsx est une dépendance lourde utilisée uniquement par les pages
 * admin, elle ne doit pas alourdir le bundle initial ni le pré-cache du service worker.
 */
export async function exportToExcel(
  rows: Record<string, string | number | boolean | null>[],
  filename: string,
  sheetName = 'Export'
): Promise<void> {
  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}
