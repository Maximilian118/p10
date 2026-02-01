/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef } from "react"

// Handlers that a nested form provides to the parent ButtonBar.
export interface FormHandlers {
  id: string
  submit: () => Promise<void>
  back: () => void
  isEditing: boolean
  loading: boolean
  delLoading: boolean
  canDelete: boolean
  canRemove: boolean
  canSubmit: boolean
  onDelete?: () => Promise<void>
  onRemove?: () => void
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

// Custom hook for form components to register their handlers with the parent ButtonBar.
// When embedded=true and inside ChampFlowProvider, handlers are pushed to a stack
// that ButtonBar reads from. On unmount, handlers are popped from the stack.
// Returns showButtonBar: true when the component should render its own ButtonBar
// (i.e., when NOT embedded or NOT in ChampFlow context).
export const useChampFlowForm = (
  handlers: Omit<FormHandlers, 'id'>,
  embedded: boolean,
): { showButtonBar: boolean } => {
  const { inChampFlow, pushHandlers, popHandlers } = useChampFlow()
  const handlerIdRef = useRef<string | null>(null)
  const handlersRef = useRef(handlers)

  // Always keep handlersRef current so wrappers call latest handlers.
  handlersRef.current = handlers

  // Create stable wrappers that call through the ref to get latest handlers.
  const stableHandlers = useRef<Omit<FormHandlers, 'id'>>({
    submit: async () => { await handlersRef.current.submit() },
    back: () => { handlersRef.current.back() },
    onDelete: async () => { await handlersRef.current.onDelete?.() },
    onRemove: () => { handlersRef.current.onRemove?.() },
    isEditing: false,
    loading: false,
    delLoading: false,
    canDelete: false,
    canRemove: false,
    canSubmit: true,
  }).current

  // Update static values on each render (read when ButtonBar renders).
  stableHandlers.isEditing = handlers.isEditing
  stableHandlers.loading = handlers.loading
  stableHandlers.delLoading = handlers.delLoading
  stableHandlers.canDelete = handlers.canDelete
  stableHandlers.canRemove = handlers.canRemove
  stableHandlers.canSubmit = handlers.canSubmit

  // Push on mount, pop on unmount (only when embedded in ChampFlow context).
  useEffect(() => {
    if (embedded && inChampFlow) {
      handlerIdRef.current = pushHandlers(stableHandlers)
      return () => {
        if (handlerIdRef.current) {
          popHandlers(handlerIdRef.current)
          handlerIdRef.current = null
        }
      }
    }
  }, [embedded, inChampFlow, pushHandlers, popHandlers, stableHandlers])

  // Show ButtonBar only when not embedded or not in champ flow.
  return { showButtonBar: !embedded || !inChampFlow }
}

export const ChampFlowProvider = ChampFlowContext.Provider

export default ChampFlowContext
