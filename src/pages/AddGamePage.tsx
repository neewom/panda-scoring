import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { GripVertical, X } from 'lucide-react'
import { getGames, getGameById, addGame, updateGame, buildCustomGame, type Game, type ScoringField, type ComputedField } from '@/lib/games'
import PageHeader from '@/components/PageHeader'

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */

interface CategoryItem {
  id: string
  label: string
  type: 'number' | 'boolean'
}

/* ─────────────────────────────────────────
   SortableCategoryRow
───────────────────────────────────────── */

interface SortableCategoryRowProps {
  category: CategoryItem
  onLabelChange: (id: string, label: string) => void
  onTypeChange: (id: string, type: 'number' | 'boolean') => void
  onRemove: (id: string) => void
  focusOnMount: boolean
}

function SortableCategoryRow({
  category,
  onLabelChange,
  onTypeChange,
  onRemove,
  focusOnMount,
}: SortableCategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  })
  const inputRef = useRef<HTMLInputElement>(null)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-2">
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none p-1 text-purple-200 hover:text-purple-400 transition-colors shrink-0"
        aria-label="Réordonner la catégorie"
      >
        <GripVertical size={16} />
      </div>

      <div className="flex-1 flex items-center gap-2 min-w-0 rounded-2xl border border-purple-100 bg-white px-3 py-2">
        <input
          ref={inputRef}
          type="text"
          value={category.label}
          onChange={(e) => onLabelChange(category.id, e.target.value)}
          placeholder="ex: Arbres, Points de victoire…"
          aria-label="Label de la catégorie"
          className="flex-1 min-w-0 text-sm text-purple-800 placeholder:text-purple-200 bg-transparent outline-none"
        />
        <div className="flex rounded-lg border border-purple-200 overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => onTypeChange(category.id, 'number')}
            aria-label="Type nombre"
            className={`px-2 py-1 text-xs font-medium transition-colors ${
              category.type === 'number'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-purple-400 hover:bg-purple-50'
            }`}
          >
            123
          </button>
          <button
            type="button"
            onClick={() => onTypeChange(category.id, 'boolean')}
            aria-label="Type oui/non"
            className={`px-2 py-1 text-xs font-medium transition-colors ${
              category.type === 'boolean'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-purple-400 hover:bg-purple-50'
            }`}
          >
            ✓/✗
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(category.id)}
        aria-label={`Supprimer la catégorie ${category.label || 'sans nom'}`}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-purple-300 hover:text-purple-600 hover:bg-purple-100 transition-colors"
      >
        <X size={14} />
      </button>
    </li>
  )
}

/* ─────────────────────────────────────────
   AddGamePage
───────────────────────────────────────── */

function inferRoundsType(game: Game): 'fixed' | 'perPlayer' | 'threshold' {
  if (game.end_condition) return 'threshold'
  if (typeof game.rounds === 'object' && game.rounds !== null) return 'perPlayer'
  return 'fixed'
}

export default function AddGamePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const editGame = id ? getGameById(id) : undefined
  const isEditMode = Boolean(editGame)

  // General info
  const [gameName, setGameName] = useState(editGame?.name ?? '')
  const [publisher, setPublisher] = useState(editGame?.publisher ?? '')
  const [playersMin, setPlayersMin] = useState(String(editGame?.players.min ?? 2))
  const [playersMax, setPlayersMax] = useState(String(editGame?.players.max ?? 4))

  // Scoring model
  const [scoringModel, setScoringModel] = useState<'end_game' | 'per_round'>(
    editGame?.scoring_model === 'per_round' ? 'per_round' : 'end_game'
  )
  const [roundsType, setRoundsType] = useState<'fixed' | 'perPlayer' | 'threshold'>(
    editGame ? inferRoundsType(editGame) : 'fixed'
  )
  const [roundsCount, setRoundsCount] = useState(
    typeof editGame?.rounds === 'number' ? String(editGame.rounds) : '3'
  )
  const [scoreThreshold, setScoreThreshold] = useState(
    editGame?.end_condition ? String(editGame.end_condition.score_threshold) : ''
  )
  const [lowestWins, setLowestWins] = useState(editGame?.lowest_wins ?? false)

  // Categories — seeded from existing scoring fields when editing
  const [categories, setCategories] = useState<CategoryItem[]>(
    editGame?.scoring.map((f) => ({ id: crypto.randomUUID(), label: f.label, type: f.type })) ?? []
  )
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)

  // Optional
  const [tiebreakDesc, setTiebreakDesc] = useState(editGame?.tiebreak_description ?? '')
  const [scoringNotes, setScoringNotes] = useState(editGame?.scoring_notes ?? '')

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function clearError(...keys: string[]) {
    setErrors((prev) => {
      const next = { ...prev }
      keys.forEach((k) => delete next[k])
      return next
    })
  }

  function handleAddCategory() {
    const newId = crypto.randomUUID()
    setCategories((prev) => [...prev, { id: newId, label: '', type: 'number' }])
    setLastAddedId(newId)
    clearError('categories')
  }

  function handleUpdateLabel(id: string, label: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)))
    clearError('categories')
  }

  function handleUpdateType(id: string, type: 'number' | 'boolean') {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, type } : c)))
  }

  function handleRemoveCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setCategories((prev) => {
        const oldIndex = prev.findIndex((c) => c.id === active.id)
        const newIndex = prev.findIndex((c) => c.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    const trimmedName = gameName.trim()
    if (!trimmedName) {
      newErrors.gameName = 'Le nom du jeu est requis'
    } else {
      const exists = getGames().find(
        (g) => g.name.toLowerCase() === trimmedName.toLowerCase() && g.id !== editGame?.id
      )
      if (exists) newErrors.gameName = 'Un jeu avec ce nom existe déjà'
    }

    const min = parseInt(playersMin)
    const max = parseInt(playersMax)
    if (isNaN(min) || min < 1) newErrors.playersMin = 'Minimum 1'
    if (isNaN(max) || max < 1) newErrors.playersMax = 'Minimum 1'
    if (!isNaN(min) && !isNaN(max) && min > max) newErrors.playersMax = 'Doit être ≥ au minimum'

    const validCats = categories.filter((c) => c.label.trim())
    if (validCats.length === 0) newErrors.categories = 'Au moins 1 catégorie requise'

    if (scoringModel === 'per_round' && roundsType === 'fixed') {
      const rounds = parseInt(roundsCount)
      if (isNaN(rounds) || rounds < 1) newErrors.roundsCount = 'Nombre de manches requis (≥ 1)'
    }

    if (scoringModel === 'per_round' && roundsType === 'threshold') {
      const threshold = parseInt(scoreThreshold)
      if (isNaN(threshold) || threshold < 1) newErrors.scoreThreshold = 'Seuil requis (≥ 1)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const validCats = categories.filter((c) => c.label.trim())
    let rounds: number | { perPlayer: number } | undefined
    let endCondition: { score_threshold: number } | undefined
    if (scoringModel === 'per_round') {
      if (roundsType === 'perPlayer') rounds = { perPlayer: 1 }
      else if (roundsType === 'fixed') rounds = parseInt(roundsCount)
      else if (roundsType === 'threshold') endCondition = { score_threshold: parseInt(scoreThreshold) }
    }

    if (isEditMode && editGame) {
      // Rebuild scoring fields with positional IDs, preserve game identity
      const scoring: ScoringField[] = validCats.map((cat, i) => ({
        id: `field_${i}`,
        label: cat.label,
        type: cat.type,
        confident: true,
      }))
      const numberIds = scoring.filter((f) => f.type === 'number').map((f) => f.id)
      const totalFormula = numberIds.length > 0 ? numberIds.join(' + ') : '0'
      const computed: ComputedField[] = [{ id: 'total', formula: totalFormula, confident: true }]

      const updatedGame: Game = {
        ...editGame,
        name: gameName.trim(),
        publisher: publisher.trim() || undefined,
        players: { min: parseInt(playersMin), max: parseInt(playersMax) },
        scoring_model: scoringModel,
        rounds,
        end_condition: endCondition,
        lowest_wins: lowestWins || undefined,
        scoring,
        computed,
        tieBreak: undefined,
        tiebreak_description: tiebreakDesc.trim() || undefined,
        scoring_notes: scoringNotes.trim() || undefined,
        validated: true,
      }
      updateGame(updatedGame)
      navigate(`/games/${editGame.id}`)
    } else {
      const game = buildCustomGame({
        name: gameName,
        publisher: publisher || undefined,
        playersMin: parseInt(playersMin),
        playersMax: parseInt(playersMax),
        scoringModel,
        rounds,
        end_condition: endCondition,
        lowest_wins: lowestWins || undefined,
        categories: validCats.map((c) => ({ label: c.label, type: c.type })),
        tiebreakDescription: tiebreakDesc || undefined,
        scoringNotes: scoringNotes || undefined,
      })
      addGame(game)
      navigate(`/games/${game.id}`)
    }
  }

  const categoryIds = categories.map((c) => c.id)

  /* ── Render ── */
  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-screen flex flex-col items-center px-4 py-12 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50"
    >
      <div className="w-full max-w-sm space-y-8">

        {/* Header */}
        <PageHeader
          title={isEditMode ? 'Modifier le jeu' : 'Nouveau jeu'}
          onBack={() => isEditMode ? navigate(`/games/${editGame!.id}`) : navigate('/games')}
          backLabel={isEditMode ? editGame!.name : 'Bibliothèque'}
        />

        {/* ── Section 1 : Informations générales ── */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-purple-500 uppercase tracking-wide">
            Informations générales
          </h2>

          <div className="space-y-1">
            <label htmlFor="gameName" className="text-xs text-purple-500">
              Nom du jeu *
            </label>
            <input
              id="gameName"
              type="text"
              value={gameName}
              onChange={(e) => { setGameName(e.target.value); clearError('gameName') }}
              placeholder="ex: Ticket to Ride"
              aria-label="Nom du jeu"
              className={`w-full h-10 rounded-xl border-2 px-3 text-sm bg-white focus:outline-none ${
                errors.gameName ? 'border-pink-400 focus:border-pink-500' : 'border-purple-200 focus:border-purple-400'
              }`}
            />
            {errors.gameName && <p className="text-xs text-pink-500">{errors.gameName}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="publisher" className="text-xs text-purple-500">
              Éditeur
            </label>
            <input
              id="publisher"
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="ex: Days of Wonder"
              aria-label="Éditeur"
              className="w-full h-10 rounded-xl border-2 border-purple-200 px-3 text-sm bg-white focus:outline-none focus:border-purple-400"
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-purple-500">Nombre de joueurs *</p>
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-1">
                <input
                  type="number"
                  value={playersMin}
                  onChange={(e) => { setPlayersMin(e.target.value); clearError('playersMin', 'playersMax') }}
                  min={1}
                  placeholder="min"
                  aria-label="Nombre minimum de joueurs"
                  className={`w-full h-10 rounded-xl border-2 px-3 text-sm bg-white focus:outline-none text-center ${
                    errors.playersMin ? 'border-pink-400' : 'border-purple-200 focus:border-purple-400'
                  }`}
                />
                {errors.playersMin && <p className="text-xs text-pink-500">{errors.playersMin}</p>}
              </div>
              <span className="text-purple-400 text-sm pt-2.5 shrink-0">—</span>
              <div className="flex-1 space-y-1">
                <input
                  type="number"
                  value={playersMax}
                  onChange={(e) => { setPlayersMax(e.target.value); clearError('playersMin', 'playersMax') }}
                  min={1}
                  placeholder="max"
                  aria-label="Nombre maximum de joueurs"
                  className={`w-full h-10 rounded-xl border-2 px-3 text-sm bg-white focus:outline-none text-center ${
                    errors.playersMax ? 'border-pink-400' : 'border-purple-200 focus:border-purple-400'
                  }`}
                />
                {errors.playersMax && <p className="text-xs text-pink-500">{errors.playersMax}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2 : Modèle de scoring ── */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-purple-500 uppercase tracking-wide">
            Modèle de scoring
          </h2>

          <div className="flex rounded-2xl border border-purple-200 overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setScoringModel('end_game')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                scoringModel === 'end_game' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:bg-purple-50'
              }`}
            >
              Fin de partie
            </button>
            <button
              type="button"
              onClick={() => setScoringModel('per_round')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                scoringModel === 'per_round' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:bg-purple-50'
              }`}
            >
              Par manche
            </button>
          </div>

          {scoringModel === 'per_round' && (
            <div className="space-y-3 pl-3 border-l-2 border-purple-100">
              <div className="flex rounded-2xl border border-purple-200 overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setRoundsType('fixed')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    roundsType === 'fixed' ? 'bg-purple-100 text-purple-700' : 'text-purple-400 hover:bg-purple-50'
                  }`}
                >
                  Nombre fixe
                </button>
                <button
                  type="button"
                  onClick={() => setRoundsType('perPlayer')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    roundsType === 'perPlayer' ? 'bg-purple-100 text-purple-700' : 'text-purple-400 hover:bg-purple-50'
                  }`}
                >
                  = Nbre joueurs
                </button>
                <button
                  type="button"
                  onClick={() => setRoundsType('threshold')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    roundsType === 'threshold' ? 'bg-purple-100 text-purple-700' : 'text-purple-400 hover:bg-purple-50'
                  }`}
                >
                  Seuil score
                </button>
              </div>

              {roundsType === 'fixed' && (
                <div className="space-y-1">
                  <input
                    type="number"
                    value={roundsCount}
                    onChange={(e) => { setRoundsCount(e.target.value); clearError('roundsCount') }}
                    min={1}
                    placeholder="Nombre de manches"
                    aria-label="Nombre de manches"
                    className={`w-full h-10 rounded-xl border-2 px-3 text-sm bg-white focus:outline-none ${
                      errors.roundsCount ? 'border-pink-400' : 'border-purple-200 focus:border-purple-400'
                    }`}
                  />
                  {errors.roundsCount && <p className="text-xs text-pink-500">{errors.roundsCount}</p>}
                </div>
              )}

              {roundsType === 'threshold' && (
                <div className="space-y-1">
                  <input
                    type="number"
                    value={scoreThreshold}
                    onChange={(e) => { setScoreThreshold(e.target.value); clearError('scoreThreshold') }}
                    min={1}
                    placeholder="ex: 66"
                    aria-label="Seuil de score"
                    className={`w-full h-10 rounded-xl border-2 px-3 text-sm bg-white focus:outline-none ${
                      errors.scoreThreshold ? 'border-pink-400' : 'border-purple-200 focus:border-purple-400'
                    }`}
                  />
                  {errors.scoreThreshold && <p className="text-xs text-pink-500">{errors.scoreThreshold}</p>}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-purple-700">Score le plus bas gagne</span>
            <button
              type="button"
              onClick={() => setLowestWins((v) => !v)}
              aria-label="Score le plus bas gagne"
              className={`relative w-10 h-6 rounded-full transition-colors ${lowestWins ? 'bg-purple-600' : 'bg-purple-200'}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${lowestWins ? 'translate-x-5' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>

        {/* ── Section 3 : Catégories de scoring ── */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-purple-500 uppercase tracking-wide">
            Catégories de scoring *
          </h2>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2" aria-label="Catégories de scoring">
                {categories.map((cat) => (
                  <SortableCategoryRow
                    key={cat.id}
                    category={cat}
                    onLabelChange={handleUpdateLabel}
                    onTypeChange={handleUpdateType}
                    onRemove={handleRemoveCategory}
                    focusOnMount={cat.id === lastAddedId}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <Button
            type="button"
            onClick={handleAddCategory}
            variant="outline"
            aria-label="Ajouter une catégorie de scoring"
            className="w-full h-10 border-2 border-dashed border-purple-200 text-purple-400 hover:border-purple-400 hover:text-purple-600 rounded-2xl font-medium text-sm bg-transparent"
          >
            + Ajouter une catégorie
          </Button>

          {errors.categories && (
            <p className="text-xs text-pink-500">{errors.categories}</p>
          )}
        </div>

        {/* ── Section 4 : Informations complémentaires ── */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm font-semibold text-purple-400 hover:text-purple-600 transition-colors uppercase tracking-wide">
            Informations complémentaires ▾
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="space-y-1">
              <label className="text-xs text-purple-500">Règle de départage</label>
              <input
                type="text"
                value={tiebreakDesc}
                onChange={(e) => setTiebreakDesc(e.target.value)}
                placeholder="ex: En cas d'égalité, le joueur avec le plus de cartes l'emporte"
                aria-label="Règle de départage"
                className="w-full h-10 rounded-xl border-2 border-purple-200 px-3 text-sm bg-white focus:outline-none focus:border-purple-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-purple-500">Notes de scoring</label>
              <input
                type="text"
                value={scoringNotes}
                onChange={(e) => setScoringNotes(e.target.value)}
                placeholder="ex: Bonus de 10 points si..."
                aria-label="Notes de scoring"
                className="w-full h-10 rounded-xl border-2 border-purple-200 px-3 text-sm bg-white focus:outline-none focus:border-purple-400"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ── Submit ── */}
        <Button
          type="submit"
          className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl"
        >
          {isEditMode ? 'Enregistrer les modifications' : 'Enregistrer le jeu'}
        </Button>

      </div>
    </form>
  )
}
