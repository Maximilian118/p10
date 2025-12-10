import React, { useEffect, useState } from "react"
import "./_search.scss"
import { TextField } from "@mui/material"
import { sortAlphabetically } from "../../../shared/utility"
import Fuse from "fuse.js"

interface searchType<T> {
  original: T[] // Original array of objects. Likely the result of a request.
  setSearch: React.Dispatch<React.SetStateAction<T[]>> // State of the filtered search.
  preserveOrder?: boolean // If true, preserve original order when query is empty instead of sorting alphabetically.
  label?: string // Optional custom label for the search field.
}

const Search = <T extends { name: string }>({ original, setSearch, preserveOrder, label = "Search" }: searchType<T>) => {
  const [ query, setQuery ] = useState("")

  // Debounced fuzzy search using Fuse.js.
  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim() === "") {
        // No query - return original array (sorted alphabetically unless preserveOrder is true).
        setSearch(preserveOrder ? original : sortAlphabetically(original))
      } else {
        // Fuzzy search with Fuse.js.
        const fuse = new Fuse(original, {
          keys: ["name"],
          threshold: 0.4, // 0 = exact match, 1 = match anything.
        })
        const results = fuse.search(query).map(result => result.item)
        setSearch(results) // Fuse returns results ranked by relevance.
      }
    }, 300) // Debounce 300ms.

    return () => clearTimeout(handler)
  }, [query, original, setSearch, preserveOrder])
  
  return (
    <TextField
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
      InputProps={{ disableUnderline: true }}
      className="search"
      label={label}
      variant="filled"
    />
  )
}

export default Search
