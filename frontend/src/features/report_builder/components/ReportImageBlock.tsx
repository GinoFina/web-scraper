import { useState, useRef } from 'react'

export default function ReportImageBlock({ config, onUpdateConfig }: { config?: any, onUpdateConfig?: (cfg: any) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (onUpdateConfig) {
          onUpdateConfig({ ...config, imageData: reader.result as string })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="bg-[var(--color-surface-800)] rounded-lg border border-[var(--color-border)] flex-1 flex flex-col relative group overflow-hidden min-h-[200px]">
      
      {/* Remove Image Button */}
      {config?.imageData && (
        <button 
          onClick={() => onUpdateConfig && onUpdateConfig({ ...config, imageData: null })}
          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 print:hidden"
          title="Remove Image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {config?.imageData ? (
        <div className="flex-1 w-full flex items-center justify-center p-2">
          <img 
            src={config.imageData} 
            alt="Uploaded block" 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-[var(--color-text-muted)] print:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm mb-4">No image uploaded</p>
          <input 
            type="file" 
            accept="image/png, image/jpeg, image/jpg" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-[var(--color-surface-700)] hover:bg-[var(--color-surface-600)] text-white text-sm rounded-md transition-colors"
          >
            Upload Image
          </button>
        </div>
      )}
    </div>
  )
}
