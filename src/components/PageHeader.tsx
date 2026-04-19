import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  onBack?: () => void
}

export default function PageHeader({ title, onBack }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="relative flex items-center h-10 mb-6">
      {onBack ? (
        <>
          <button
            onClick={onBack}
            aria-label="Retour"
            className="absolute left-0 text-sm text-purple-400 hover:text-purple-600 transition-colors whitespace-nowrap"
          >
            ← Retour
          </button>
          <h1 className="w-full text-center text-2xl font-bold text-purple-700">{title}</h1>
          <button
            onClick={() => navigate('/')}
            aria-label="Accueil"
            className="absolute right-0 text-xl text-purple-400 hover:text-purple-600 transition-colors"
          >
            🏠
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => navigate('/')}
            aria-label="Accueil"
            className="absolute left-0 text-xl text-purple-400 hover:text-purple-600 transition-colors"
          >
            🏠
          </button>
          <h1 className="w-full text-center text-2xl font-bold text-purple-700">{title}</h1>
        </>
      )}
    </div>
  )
}
