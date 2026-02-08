import { useAuth, SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";

export default function DebugToken() {
  const { getToken } = useAuth();

  const handleGetToken = async () => {
    const token = await getToken();
    console.log("CLERK JWT:", token);
    alert(token);
  };

  return (
    <>
      <SignedOut>
        <SignInButton />
      </SignedOut>

      <SignedIn>
        <button onClick={handleGetToken}>
          SHOW CLERK JWT
        </button>
      </SignedIn>
    </>
  );
}
