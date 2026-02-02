import React from "react"
import ButtonBar from "../../../../components/utility/buttonBar/ButtonBar"
import { buildButtons } from "./buttonConfigs"
import { CreateChampToolbarProps } from "./types"

// Toolbar with navigation and action buttons for the championship creation form.
const CreateChampToolbar: React.FC<CreateChampToolbarProps> = (props) => {
  const buttons = buildButtons(props)

  return <ButtonBar background position="relative" buttons={buttons} />
}

export default CreateChampToolbar
