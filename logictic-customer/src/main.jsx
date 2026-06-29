import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ConfigProvider } from "antd";
import App from "./App";
import "./styles/fonts.css";

const fontFamily = '"Times New Roman", Times, serif';

const muiTheme = createTheme({
  typography: {
    fontFamily,
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider theme={{ token: { fontFamily } }}>
      <ThemeProvider theme={muiTheme}>
        <App />
      </ThemeProvider>
    </ConfigProvider>
  </React.StrictMode>
);