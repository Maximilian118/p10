import React, { useEffect, useState } from "react"
import "./_search.scss"
import { TextField } from "@mui/material"
import { sortAlphabetically } from "../../../shared/utility"

interface searchType<T> {
  original: T[] // Original array of objects. Likely the result of a request.
  setSearch: React.Dispatch<React.SetStateAction<T[]>> // State of the filtered search.
}

const Search = <T extends { name: string }>({ original, setSearch }: searchType<T>) => {
  const [ query, setQuery ] = useState("")

  useEffect(() => {
    const handler = setTimeout(() => { // setTimeout to prevent lag if user mashes the keyboard.
      if (query.trim() === "") {
        setSearch(sortAlphabetically(original)) // Return search to the original array.
      } else {
        const filtered = original.filter(item =>
          item.name.toLowerCase().includes(query.toLowerCase()) // Ignore case.
        )
        setSearch(sortAlphabetically(filtered)) // Set search state to the filtered array.
      }
    }, 300) // Debounce time 0.3s I.E change state only once per 0.3s.

    return () => clearTimeout(handler) // Cleanup
  }, [query, original, setSearch])
  
  return (
    <TextField
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
      InputProps={{ disableUnderline: true }}
      className="search"
      label="Search"
      variant="filled"
    />
  )
}

export default Search
