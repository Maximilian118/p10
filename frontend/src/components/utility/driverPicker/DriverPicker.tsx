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
  onAdd: (driver: driverType) => void                // Called when driver selected
  onRemove: (driver: driverType) => void             // Called when driver removed
  onEdit: (driver: driverType) => void               // Called when driver card clicked
  onNew: () => void                                  // Called when "New Driver" clicked
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
        displayNew="always"
        customNewLabel="Driver"
        onNewMouseDown={() => onNew()}
        options={availableDrivers}
        value={value ? value.name : null}
        loading={loading}
        error={error}
        setObjValue={setValue}
        onLiClick={(val) => onAdd(val)}
        onChange={() => { if (onChange) { onChange() } }}
      />
      <div className="driver-picker-list">
        {sortAlphabetically(selectedDrivers).map((driver: driverType, i: number) => (
          <DriverCard
            key={i}
            driver={driver}
            onRemove={(d) => onRemove(d)}
            canRemove={!disabled}
            onClick={() => onEdit(driver)}
          />
        ))}
      </div>
      <AddButton
        onClick={() => onNew()}
        absolute
      />
    </div>
  )
}

export default DriverPicker
