import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./api/queryClient";
import { ToastProvider } from "./components/ui/Toast";
import { AppRoutes } from "./routes/AppRoutes";

export default function App() {
  useEffect(() => {
    const handleLogout = () => {
      queryClient.clear();
    };
    window.addEventListener("sehatsetu:logout", handleLogout);
    return () => window.removeEventListener("sehatsetu:logout", handleLogout);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
