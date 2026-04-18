import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
}

export default function PageHeader({ title }: PageHeaderProps) {
  const navigate = useNavigate()

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="relative flex items-center h-10 mb-6">
      <button
        onClick={goBack}
        aria-label="Retour"
        className="absolute left-0 text-sm text-purple-400 hover:text-purple-600 transition-colors whitespace-nowrap"
      >
        ← Retour
      </button>
      <h1 className="w-full text-center text-2xl font-bold text-purple-700">{title}</h1>
    </div>
  )
}
