import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#5ea3ff" },
    background: { default: "#0e1620", paper: "#111419" },
  },
  typography: {
    fontFamily: '"Roboto", "Arial", sans-serif',
  },
});

export default theme;
