/**
 * Gom mọi provider cấp ứng dụng vào một chỗ.
 *
 * Trước đây chúng nằm rải trong main.jsx; tách ra để main.jsx chỉ còn
 * việc mount, và thêm/bớt provider không phải đụng vào điểm khởi động.
 */
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ConfigProvider } from "antd";
import { GoogleOAuthProvider } from "@react-oauth/google";

/** Font dùng chung cho cả MUI lẫn Ant Design — đổi ở đây là đổi toàn app. */
const FONT_FAMILY = '"Times New Roman", Times, serif';

const muiTheme = createTheme({
  typography: { fontFamily: FONT_FAMILY },
});

const antdTheme = {
  token: { fontFamily: FONT_FAMILY },
};

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "placeholder";

export default function AppProviders({ children }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ConfigProvider theme={antdTheme}>
        <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
      </ConfigProvider>
    </GoogleOAuthProvider>
  );
}
