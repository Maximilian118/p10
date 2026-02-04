import { createTheme } from "@mui/material/styles"

// Dark theme for MUI components used on dark backgrounds.
// Wrap components with <ThemeProvider theme={darkTheme}> to apply.
const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
  typography: {
    allVariants: {
      fontFamily: "formula1-regular",
      fontSize: 14,
    },
    button: {
      textTransform: "none",
    },
  },
})

export default darkTheme
