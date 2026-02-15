import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";
import { ENABLE_CLERK_AUTH, CLERK_PUBLISHABLE_KEY } from "./config/app.config";

const root = createRoot(document.getElementById("root")!);

// Conditionally wrap with ClerkProvider based on config
if (ENABLE_CLERK_AUTH && CLERK_PUBLISHABLE_KEY) {
  // Dynamic import Clerk only when enabled
  import("@clerk/clerk-react").then(({ ClerkProvider }) => {
    root.render(
      <StrictMode>
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
          <App />
        </ClerkProvider>
      </StrictMode>
    );
  });
} else {
  // Render without Clerk authentication
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
