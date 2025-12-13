import React, { createContext, useContext, useEffect, useRef } from "react"

// Handlers that a nested form provides to the parent ButtonBar.
export interface FormHandlers {
  id: string
  submit: () => Promise<void>
  back: () => void
  isEditing: boolean
  loading: boolean
  delLoading: boolean
  canDelete: boolean
  onDelete?: () => Promise<void>
}

// Context type for the championship creation flow.
export interface ChampFlowContextType {
  inChampFlow: boolean
  handlerStack: FormHandlers[]
  pushHandlers: (handlers: Omit<FormHandlers, 'id'>) => string
  popHandlers: (id: string) => void
}

// Default context value (used when not inside ChampFlowProvider).
const defaultContext: ChampFlowContextType = {
  inChampFlow: false,
  handlerStack: [],
  pushHandlers: () => "",
  popHandlers: () => {},
}

const ChampFlowContext = createContext<ChampFlowContextType>(defaultContext)

// Custom hook to access ChampFlowContext.
export const useChampFlow = (): ChampFlowContextType => {
  return useContext(ChampFlowContext)
}

// Helper to get the topmost handlers from the stack.
export const getActiveHandlers = (stack: FormHandlers[]): FormHandlers | null => {
  return stack.length > 0 ? stack[stack.length - 1] : null
}

// Custom hook for Create components to register their handlers with the parent.
export const useChampFlowForm = (
  handlers: Omit<FormHandlers, 'id'>,
  embedded: boolean,
): { showButtonBar: boolean } => {
  const { inChampFlow, pushHandlers, popHandlers } = useChampFlow()
  const handlerIdRef = useRef<string | null>(null)
  const handlersRef = useRef(handlers)

  // Keep handlers ref updated (for initial push only).
  handlersRef.current = handlers

  // Push on mount, pop on unmount. NO dependency on handlers.
  useEffect(() => {
    if (embedded && inChampFlow) {
      handlerIdRef.current = pushHandlers(handlersRef.current)
      return () => {
        if (handlerIdRef.current) {
          popHandlers(handlerIdRef.current)
          handlerIdRef.current = null
        }
      }
    }
  }, [embedded, inChampFlow, pushHandlers, popHandlers])

  // Show ButtonBar only when not embedded or not in champ flow.
  return { showButtonBar: !embedded || !inChampFlow }
}

export const ChampFlowProvider = ChampFlowContext.Provider

export default ChampFlowContext
