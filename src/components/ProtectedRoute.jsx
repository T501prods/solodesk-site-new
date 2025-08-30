// src/ProtectedRoute.jsx
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { account } from "./lib/appwrite";

export default function ProtectedRoute({ children }) {
  const [ok, setOk] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    account.get().then(
      () => mounted && setOk(true),
      () => mounted && setOk(false)
    );
    return () => { mounted = false; };
  }, []);

  if (ok === null) return null;
  return ok
    ? children
    : <Navigate to="/login" replace state={{ from: location }} />;
}
