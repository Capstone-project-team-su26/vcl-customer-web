import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ConfigProvider } from "antd";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./styles/fonts.css";

const fontFamily = '"Times New Roman", Times, serif';

const muiTheme = createTheme({
  typography: {
    fontFamily,
  },
});

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "placeholder";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <ConfigProvider theme={{ token: { fontFamily } }}>
        <ThemeProvider theme={muiTheme}>
          <App />
        </ThemeProvider>
      </ConfigProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);