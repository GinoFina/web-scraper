import { useReportStore } from '../../../store/reportStore'

export default function ReportTextBlock({ id, content }: { id: string, content: string }) {
  const updateItemContent = useReportStore(s => s.updateItemContent)

  return (
    <textarea
      className="w-full min-h-[100px] bg-transparent resize-y border border-dashed border-[var(--color-border)] p-2 rounded focus:outline-none focus:border-[var(--color-accent-primary)] print:border-none print:resize-none text-[var(--color-text-primary)]"
      placeholder="Type scouting notes here..."
      value={content || ''}
      onChange={(e) => updateItemContent(id, e.target.value)}
    />
  )
}
