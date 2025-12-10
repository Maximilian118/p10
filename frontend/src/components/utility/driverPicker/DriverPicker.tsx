import React from "react"
import './_driverPicker.scss'
import MUIAutocomplete from "../muiAutocomplete/muiAutocomplete"
import { driverType } from "../../../shared/types"
import DriverCard from "../../cards/driverCard/DriverCard"
import { sortAlphabetically } from "../../../shared/utility"
import AddButton from "../button/addButton/AddButton"

interface DriverPickerProps {
  drivers: driverType[]                              // Available drivers to pick from
  selectedDrivers: driverType[]                      // Currently selected drivers
  value: driverType | null                           // Autocomplete current value
  setValue: React.Dispatch<React.SetStateAction<driverType | null>>  // Set autocomplete value
  loading?: boolean                                  // Loading state for autocomplete
  label: string                                      // Autocomplete label
  error?: boolean                                    // Error state
  disabled?: boolean                                 // Disable all interactions
  readOnly?: boolean                                 // View-only mode (no add/remove/edit)
  onAdd?: (driver: driverType) => void               // Called when driver selected
  onRemove?: (driver: driverType) => void            // Called when driver removed
  onEdit?: (driver: driverType) => void              // Called when driver card clicked
  onNew?: () => void                                 // Called when "New Driver" clicked
  onChange?: () => void                              // Called on value change (for clearing errors)
}

// Reusable driver picker component for forms.
const DriverPicker: React.FC<DriverPickerProps> = ({
  drivers,
  selectedDrivers,
  value,
  setValue,
  loading = false,
  label,
  error = false,
  disabled = false,
  readOnly = false,
  onAdd,
  onRemove,
  onEdit,
  onNew,
  onChange,
}) => {
  // Filter out already-selected drivers from the autocomplete options.
  const availableDrivers = drivers.filter(
    d => !selectedDrivers.some(sd => sd._id === d._id)
  )

  return (
    <div className="driver-picker">
      <MUIAutocomplete
        label={label}
        displayNew={readOnly ? "never" : "always"}
        customNewLabel="Driver"
        onNewMouseDown={readOnly ? undefined : () => onNew?.()}
        options={readOnly ? selectedDrivers : availableDrivers}
        value={value ? value.name : null}
        loading={loading}
        error={error}
        setObjValue={setValue}
        onLiClick={readOnly ? undefined : (val) => onAdd?.(val)}
        onChange={() => { if (onChange) { onChange() } }}
      />
      <div className="driver-picker-list">
        {sortAlphabetically(selectedDrivers).map((driver: driverType, i: number) => (
          <DriverCard
            key={i}
            driver={driver}
            onRemove={readOnly ? undefined : (d) => onRemove?.(d)}
            canRemove={!disabled && !readOnly}
            onClick={readOnly ? undefined : () => onEdit?.(driver)}
          />
        ))}
      </div>
      {!readOnly && (
        <AddButton
          onClick={() => onNew?.()}
          absolute
        />
      )}
    </div>
  )
}

export default DriverPicker
