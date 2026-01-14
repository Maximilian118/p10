import { Autocomplete, CircularProgress, Paper, TextField } from "@mui/material"
import React, { SyntheticEvent } from "react"
import './_muiAutocomplete.scss'
import { Add } from "@mui/icons-material"
import ImageIcon from "../icon/imageIcon/ImageIcon"
import BadgeOption from "../badgePicker/badgeOption/BadgeOption"
import { badgeOutcomeType, getOutcomeByHow } from "../../../shared/badges"

interface muiAutocompleteType<T> {
  label: string
  options: T[] | string[] // Array items to choose from.
  value: string | null // The current value selected.
  error: boolean
  onChange: () => void // Can be used for any change. My use case is for removing error for error prop on value change.
  setValue?: React.Dispatch<React.SetStateAction<string | null>> // setState function to mutate value.
  setObjValue?: React.Dispatch<React.SetStateAction<T | null>>
  loading?: boolean // Enables async behaviour with spinner if loading = true.
  variant?: "standard" | "filled" // Style of Textarea.
  className?: string
  customNewLabel?: string // Change the name of the label for createNew.
  displayNew?: "always" | "noOptions" | "never" // Choose the behaviour of adding a list item that can navigate to creating a new item to be listed.
  onNewMouseDown?: React.MouseEventHandler<HTMLDivElement> // When user clicks on createNew, do something.
  onLiClick?: (value: T) => void // Custom onClick functionality for options. NOTE: Stops textArea from retaining clicked option. Useful for adding option to a list.
  disabled?: boolean
  style?: React.CSSProperties
  badgeMode?: boolean // Enable badge outcome display mode with BadgeOption component.
  inputValue?: string // Controlled input text (separate from selected value).
  onInputChange?: (value: string) => void // Handler for input text changes.
}

// Return JSX for the onClick element to create a new of whatever is being listed.
const createNew = (label: string, onNewMouseDown?: React.MouseEventHandler<HTMLDivElement>, customNewLabel?: string) => (
  <div
    className="mui-autocomplete-no-options"
    onMouseDown={onNewMouseDown}
  >
    <Add/>
    <p>{`New ${customNewLabel ? customNewLabel : label}`}</p>
  </div>
)

// Detemine wheather to display createNew.
const displayCreateNew = (
  label: string, 
  hasOptions: boolean,
  onNewMouseDown?: React.MouseEventHandler<HTMLDivElement>,
  customNewLabel?: string, 
  displayNew?: string,
): JSX.Element | null => {
  if (!displayNew || displayNew === "never") {
    return null
  }

  if (displayNew === "always" || !hasOptions) {
    return createNew(label, onNewMouseDown, customNewLabel)
  }

  return null
}

const MUIAutocomplete = <T extends { url?: string, icon?: string, name: string }>({
  label,
  options,
  value,
  error,
  onChange,
  setValue,
  setObjValue,
  loading,
  variant,
  className,
  customNewLabel,
  displayNew,
  onNewMouseDown,
  onLiClick,
  disabled,
  style,
  badgeMode,
  inputValue,
  onInputChange,
}: muiAutocompleteType<T>) => {
  const findValueString = (value: T | string | null): string | null => {
    if (!value) {
      return null
    }

    if (typeof value === "string") {
      return value
    } else {
      return value.name
    }
  }

  const id = `${label}-autocomplete`
  
  return (
    <Autocomplete
      id={id}
      className={`mui-autocomplete ${className}`}
      style={style}
      value={value}
      inputValue={inputValue}
      onInputChange={(_, newInputValue, reason) => {
        // Allow parent to control input text separately from selected value.
        if (onInputChange && reason !== "reset") {
          onInputChange(newInputValue)
        }
      }}
      disabled={disabled}
      onChange={(e: SyntheticEvent<Element, Event>, value: T | string | null) => {
        if (setValue) setValue(findValueString(value))

        // In badge mode, update inputValue to badge name when selection is made.
        if (badgeMode && onInputChange && value) {
          const outcome = getOutcomeByHow(findValueString(value) as string)
          if (outcome) {
            onInputChange(outcome.name)
          }
        }

        if (setObjValue && typeof value !== "string" && !onLiClick) {
          setObjValue(value)
        }

        if (onLiClick && value && typeof value !== "string") {
          onLiClick(value)
          document.getElementById(id)?.blur()
        }

        onChange()
      }}
      options={options as (T | string)[]}
      isOptionEqualToValue={(option, value) => findValueString(option) === findValueString(value)}
      getOptionLabel={(option: T | string | null) => {
        // Return raw value (awardedHow for badges). Display text handled separately via inputValue.
        return findValueString(option) as string
      }}
      renderOption={({ key, ...props }: React.HTMLAttributes<HTMLLIElement> & { key: string }, option: T | string | null) => {
        const optionValue = findValueString(option)

        // Badge mode: render using BadgeOption component.
        if (badgeMode && optionValue) {
          const badgeOutcome = getOutcomeByHow(optionValue)
          if (badgeOutcome) {
            return (
              <li key={key} {...props}>
                <BadgeOption
                  name={badgeOutcome.name}
                  awardedDesc={badgeOutcome.awardedDesc}
                  rarity={badgeOutcome.rarity}
                />
              </li>
            )
          }
        }

        // Default rendering for non-badge options.
        return (
          <li key={key} {...props}>
            {typeof option !== "string" && !!option && <ImageIcon src={option.url || option.icon || ""} style={{ marginRight: 16 }}/>}
            <p>{optionValue}</p>
          </li>
        )
      }}
      loading={loading}
      PaperComponent={({ children }) => {
        let hasOptions = true

        if (React.isValidElement(children)) {
          const { className } = children.props
          hasOptions = className !== "MuiAutocomplete-noOptions"
        }

        return (
          <Paper>
            {hasOptions && children}
            {displayCreateNew(label, hasOptions, onNewMouseDown, customNewLabel, displayNew)}
          </Paper>  
        )
      }}
      renderInput={(params) => (
        <TextField 
          {...params}
          variant={variant ? variant : "filled"} 
          label={label} 
          error={error}
          disabled={disabled}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {loading ? (
                  <div className="spinner">
                    <CircularProgress color="inherit" size={20} />
                  </div>
                ) : null}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
    />
  )
}

export default MUIAutocomplete
