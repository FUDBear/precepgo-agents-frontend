import { useState, useEffect, useMemo } from 'react'
import type { FirestoreDocument } from '../services/firestore'

interface ScenarioCardProps {
  document: FirestoreDocument
  scenarios?: FirestoreDocument[]
  selectedScenarioId?: string | null
  onScenarioChange?: (scenarioId: string) => void
  formatDate?: (date?: Date | any) => string
}

interface ScenarioData {
  case?: {
    name?: string
    code?: string
    description?: string
  }
  case_type?: string // Direct case_type field (alternative to case.name/case.code)
  patient?: {
    name?: string
    age?: number
    categories?: string[]
  }
  scenario?: string
  learning_points?: string[]
  best_answer?: {
    option?: string
    rationale?: string
  }
  references?: string
  image?: string
  image_generated_at?: Date | any
  options?: Array<{
    title?: string
    description?: string
    option?: string
  }>
  // Option fields stored as separate fields (option_a, option_b, etc.)
  option_a?: {
    title?: string
    description?: string
    considerations?: string[]
  }
  option_b?: {
    title?: string
    description?: string
    considerations?: string[]
  }
  [key: string]: any // Allow for other option fields and additional properties
  created_at?: Date | any
  createdAt?: Date
}

export function ScenarioCard({ document, scenarios, selectedScenarioId, onScenarioChange, formatDate }: ScenarioCardProps) {
  const data = document.data as ScenarioData
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)


  // Reset selected option when scenario changes
  useEffect(() => {
    setSelectedOption(null)
    setImageLoaded(false) // Reset image loaded state when scenario changes
  }, [selectedScenarioId])


  const formatDateLocal = (date?: Date | any) => {
    if (!date) return '—'
    try {
      if (date instanceof Date) return date.toLocaleString()
      if (date?.toDate) return date.toDate().toLocaleString()
      return new Date(date).toLocaleString()
    } catch {
      return '—'
    }
  }

  const dateFormatter = formatDate || formatDateLocal
  const scenarioDate = dateFormatter(data.created_at || document.createdAt)

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option)
  }

  // Extract options from option_a, option_b, etc. fields
  // Handle both string format (option_a: "text") and object format (option_a: {title: "...", description: "..."})
  const extractedOptions = useMemo(() => {
    const options: Array<{ option: string; title?: string; description?: string }> = []
    // Access directly from document.data to ensure we get all fields
    const rawData = document.data
    const optionKeys = Object.keys(rawData).filter(key => key.startsWith('option_') && key.match(/^option_[a-z]$/i))
    
    optionKeys.sort().forEach(key => {
      const optionLetter = key.split('_')[1].toUpperCase()
      const optionData = rawData[key]
      
      if (optionData) {
        if (typeof optionData === 'string') {
          // Handle string format: option_a: "description text"
          options.push({
            option: optionLetter,
            description: optionData
          })
        } else if (typeof optionData === 'object') {
          // Handle object format: option_a: {title: "...", description: "..."}
          options.push({
            option: optionLetter,
            title: optionData.title,
            description: optionData.description
          })
        }
      }
    })
    
    return options
  }, [document.data])

  // Fallback to data.options if it exists, otherwise use extracted options
  // Check both typed data and raw document.data
  const displayOptions = (data.options && data.options.length > 0) 
    ? data.options 
    : (document.data.options && Array.isArray(document.data.options) && document.data.options.length > 0)
    ? document.data.options
    : extractedOptions

  // Handle best_answer - can be string ("Option A") or object ({option: "A"})
  const bestAnswerOption = typeof document.data.best_answer === 'string' 
    ? document.data.best_answer.replace('Option ', '').trim() // "Option A" -> "A"
    : (data.best_answer?.option || document.data.best_answer?.option || null)
  
  // Handle rationale - can be separate field or nested in best_answer
  const rationale = document.data.rationale || data.best_answer?.rationale || document.data.best_answer?.rationale || null

  const isCorrect = selectedOption === bestAnswerOption
  const showAnswer = selectedOption !== null

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md relative">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-precepgo-card-title mb-1">
              {data.case?.name || data.case?.code || 'Scenario'}
            </h3>
            <span className="text-xs text-gray-500 block">
              {scenarioDate}
            </span>
          </div>
          
          {/* Dropdown in top right */}
          {scenarios && scenarios.length > 0 && onScenarioChange && (
            <div className="w-full sm:w-auto sm:ml-4 shrink-0">
              <select
                value={selectedScenarioId || ''}
                onChange={(e) => onScenarioChange(e.target.value)}
                className="w-full sm:w-auto min-w-[200px] max-w-full px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {scenarios.map((scenario) => {
                  // Use nested case object from agent_scenarios doc
                  const caseData = scenario.data.case
                  const caseName = caseData?.name || caseData?.code || 'Unknown Case'
                  const scenarioDate = dateFormatter(scenario.createdAt || scenario.data.created_at)
                  return (
                    <option key={scenario.id} value={scenario.id}>
                      {caseName} - {scenarioDate}
                    </option>
                  )
                })}
              </select>
            </div>
          )}
        </div>
        {data.case?.description && (
          <p className="text-sm text-gray-600 mt-2">{data.case.description}</p>
        )}
      </div>

      {/* Patient Information */}
      {data.patient && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Patient Information</h4>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-4">
              {(data.patient.name || data.patient.full_name || document.data.patient?.full_name) && (
                <div>
                  <span className="text-xs text-gray-500">Name:</span>
                  <span className="ml-2 text-sm font-medium text-gray-800">
                    {data.patient.name || data.patient.full_name || document.data.patient?.full_name}
                  </span>
                </div>
              )}
              {(data.patient.age || document.data.patient?.age) && (
                <div>
                  <span className="text-xs text-gray-500">Age:</span>
                  <span className="ml-2 text-sm font-medium text-gray-800">
                    {data.patient.age || document.data.patient?.age}
                  </span>
                </div>
              )}
            </div>
            {(data.patient.categories || document.data.patient?.categories) && 
             (data.patient.categories || document.data.patient?.categories)?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {(data.patient.categories || document.data.patient?.categories || []).map((category: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scenario Text */}
      {(data.scenario || (data.learning_points && data.learning_points.length > 0)) && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Scenario</h4>
          <div 
            className="rounded-lg p-4 relative overflow-hidden"
            style={{
              backgroundColor: 'rgb(249, 250, 251)',
            }}
          >
            {/* Background image layer that fades in */}
            {data.image && (
              <>
                {/* Hidden image to track when it loads */}
                <img
                  src={data.image}
                  alt=""
                  className="hidden"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)} // Still show container even if image fails
                />
                {/* Background image layer */}
                <div 
                  className="absolute inset-0 rounded-lg transition-opacity duration-500"
                  style={{
                    backgroundImage: `url(${data.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    opacity: imageLoaded ? 1 : 0,
                  }}
                ></div>
                {/* White gradient overlay */}
                <div 
                  className="absolute inset-0 rounded-lg transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 1))',
                    opacity: imageLoaded ? 1 : 0,
                  }}
                ></div>
              </>
            )}
            {/* Text content */}
            <div className="relative z-10 space-y-4">
              {data.scenario && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
                  {data.scenario}
                </p>
              )}
              
              {/* Learning Points */}
              {data.learning_points && data.learning_points.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2 text-gray-800">
                    Learning Points
                  </h4>
                  <ul className="space-y-2">
                    {data.learning_points.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1 text-gray-800">•</span>
                        <span className="text-sm flex-1 text-gray-800">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Options - Make them selectable */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Select Your Answer</h4>
        {displayOptions && displayOptions.length > 0 ? (
          <div className="space-y-2">
            {displayOptions.map((option, idx) => {
              const optionKey = option.option || `${idx + 1}`
              const isSelected = selectedOption === optionKey
              const isCorrectOption = bestAnswerOption === optionKey
              
              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(optionKey)}
                  disabled={showAnswer}
                  className={`w-full text-left border rounded-lg p-3 transition-all ${
                    isSelected && isCorrectOption
                      ? 'border-green-500 bg-green-50'
                      : isSelected && !isCorrectOption
                      ? 'border-red-500 bg-red-50'
                      : showAnswer && isCorrectOption
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
                  } ${showAnswer ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-gray-700">{optionKey}</span>
                    {option.title && (
                      <span className="font-medium text-gray-800">{option.title}</span>
                    )}
                    {showAnswer && isCorrectOption && (
                      <span className="ml-auto px-2 py-1 bg-green-500 text-white rounded text-xs font-semibold">
                        Correct Answer
                      </span>
                    )}
                    {isSelected && !isCorrectOption && (
                      <span className="ml-auto px-2 py-1 bg-red-500 text-white rounded text-xs font-semibold">
                        Your Answer
                      </span>
                    )}
                  </div>
                  {option.description && (
                    <p className="text-sm text-gray-600 mt-2 ml-4">{option.description}</p>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg">
            No options found in this scenario.
          </div>
        )}
        
        {/* Show feedback after selection */}
        {showAnswer && displayOptions && displayOptions.length > 0 && (
          <div className={`mt-4 p-4 rounded-lg ${
            isCorrect 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm font-semibold ${
              isCorrect ? 'text-green-800' : 'text-red-800'
            }`}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect. The correct answer is shown above.'}
            </p>
          </div>
        )}
      </div>

      {/* Best Answer Rationale - Only show after selection */}
      {showAnswer && rationale && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Answer Rationale</h4>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-800 leading-relaxed">{rationale}</p>
          </div>
        </div>
      )}

      {/* References - Only show after selection */}
      {showAnswer && data.references && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">References</h4>
          <p className="text-xs text-gray-600 italic leading-relaxed">{data.references}</p>
        </div>
      )}
    </div>
  )
}

