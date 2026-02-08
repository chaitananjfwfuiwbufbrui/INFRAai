import os
from fastapi import Header, HTTPException, Depends
from jose import jwt, JWTError
from pathlib import Path
CLERK_JWT_PUBLIC_KEY = Path("clerk_public.pem").read_text()

if not CLERK_JWT_PUBLIC_KEY:
    raise RuntimeError("CLERK_JWT_PUBLIC_KEY not set")


async def get_current_user(
    authorization: str = Header(...)
) -> str:
    """
    Validates Clerk JWT and returns user_id (sub)
    """
    try:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid Authorization header")

        token = authorization.split(" ")[1]

        payload = jwt.decode(
            token,
            CLERK_JWT_PUBLIC_KEY,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk usually doesn't require aud
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        return user_id

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
