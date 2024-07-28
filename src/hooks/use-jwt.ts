import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";

export const useJwt = <T>(tokenKey: string) => {
  const [jwtData, setJwtData] = useState<T | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(tokenKey);
    if (token) {
      try {
        const decodedToken = jwtDecode<T>(token);
        setJwtData(decodedToken);
      } catch (error) {
        console.error("Invalid token:", error);
        setJwtData(null);
      }
    }
  }, [tokenKey]);

  return jwtData;
}