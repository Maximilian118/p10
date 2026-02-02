import { FormHandlers } from "../../../../context/ChampFlowContext"

// Props for the CreateChampToolbar component.
export interface CreateChampToolbarProps {
  activeStep: number
  totalSteps: number
  activeFormHandlers: FormHandlers | null
  loading?: boolean
  onStepChange: (step: number) => void
  onSubmitForm: () => void
}
