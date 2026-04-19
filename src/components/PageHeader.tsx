import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  onBack?: () => void
  backLabel?: string
}

export default function PageHeader({ title, onBack, backLabel }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="mb-6 space-y-1">

      {/* Line 1 — always present: 🏠 left, title centered */}
      <div className="relative flex items-center h-10">
        <button
          onClick={() => navigate('/')}
          aria-label="Accueil"
          className="absolute left-0 text-xl text-purple-400 hover:text-purple-600 transition-colors"
        >
          🏠
        </button>
        <h1 className="w-full text-center text-2xl font-bold text-purple-700">{title}</h1>
      </div>

      {/* Line 2 — sub-pages only: ← Retour left, parent name as subtle label */}
      {onBack && (
        <div className="flex items-center h-5">
          <button
            onClick={onBack}
            aria-label="Retour"
            className="text-xs text-purple-400 hover:text-purple-600 transition-colors whitespace-nowrap"
          >
            ← Retour{backLabel ? ` ${backLabel}` : ''}
          </button>
        </div>
      )}

    </div>
  )
}
