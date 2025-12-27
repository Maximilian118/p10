import React from "react"
import './_teamPicker.scss'
import MUIAutocomplete from "../muiAutocomplete/muiAutocomplete"
import { teamType } from "../../../shared/types"
import TeamListItem from "./TeamListItem/TeamListItem"
import { sortAlphabetically } from "../../../shared/utility"
import AddButton from "../button/addButton/AddButton"

interface TeamPickerProps {
  teams: teamType[]                              // Available teams to pick from
  selectedTeams: teamType[]                      // Currently selected teams
  value: teamType | null                         // Autocomplete current value
  setValue: React.Dispatch<React.SetStateAction<teamType | null>>  // Set autocomplete value
  loading?: boolean                              // Loading state for autocomplete
  label: string                                  // Autocomplete label
  error?: boolean                                // Error state
  disabled?: boolean                             // Disable all interactions
  emptyMessage?: string                          // Message to show when no teams selected
  onAdd?: (team: teamType) => void               // Called when team selected
  onRemove?: (team: teamType) => void            // Called when team removed
  onEdit?: (team: teamType) => void              // Called when team card clicked
  onNew?: () => void                             // Called when "New Team" clicked
  onChange?: () => void                          // Called on value change (for clearing errors)
}

// Reusable team picker component for forms.
const TeamPicker: React.FC<TeamPickerProps> = ({
  teams,
  selectedTeams,
  value,
  setValue,
  loading = false,
  label,
  error = false,
  disabled = false,
  emptyMessage,
  onAdd,
  onRemove,
  onEdit,
  onNew,
  onChange,
}) => {
  // Filter out already-selected teams from the autocomplete options.
  const availableTeams = teams.filter(
    t => !selectedTeams.some(st => st._id === t._id)
  )

  return (
    <div className="team-picker">
      <MUIAutocomplete
        label={label}
        displayNew="always"
        customNewLabel="Team"
        onNewMouseDown={() => onNew?.()}
        options={availableTeams}
        value={value ? value.name : null}
        loading={loading}
        error={error}
        setObjValue={setValue}
        onLiClick={(val) => onAdd?.(val)}
        onChange={() => { if (onChange) { onChange() } }}
      />
      <div className="team-picker-list">
        {selectedTeams.length === 0 && emptyMessage ? (
          <p className="team-picker-empty">{emptyMessage}</p>
        ) : (
          sortAlphabetically(selectedTeams).map((team: teamType, i: number) => (
            <TeamListItem
              key={i}
              team={team}
              onRemove={() => onRemove?.(team)}
              canRemove={!disabled}
              onClick={() => onEdit?.(team)}
            />
          ))
        )}
      </div>
      <AddButton
        onClick={() => onNew?.()}
        absolute
      />
    </div>
  )
}

export default TeamPicker
