import { Autocomplete, CircularProgress, Paper, TextField } from "@mui/material"
import React, { SyntheticEvent } from "react"
import './_muiAutocomplete.scss'
import { Add } from "@mui/icons-material"
import ImageIcon from "../icon/imageIcon/ImageIcon"

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
  style?: {}
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

const MUIAutocomplete = <T extends { url: string, name: string }>({ 
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
  style 
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
      disabled={disabled}
      onChange={(e: SyntheticEvent<Element, Event>, value: T | string | null) => {
        setValue && setValue(findValueString(value))

        if (setObjValue && typeof value !== "string" && !onLiClick) {
          setObjValue(value)
        }
        
        if (onLiClick && value && typeof value !== "string") {
          onLiClick(value)
          document.getElementById(id)?.blur()
        }

        onChange()
      }}
      options={options as any}
      isOptionEqualToValue={(option, value) => findValueString(option) === findValueString(value)}
      getOptionLabel={(option: T | string | null) => findValueString(option) as string}
      renderOption={(props: object, option: T | string | null, state: { index: number }) => (
        <li key={state.index} {...props}>
          {typeof option !== "string" && !!option && <ImageIcon src={option.url} style={{ marginRight: 16 }}/>}
          <p>{findValueString(option)}</p>
        </li>
      )}
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
