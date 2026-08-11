import { useEffect, useState } from "react";
import {
  FIMBA_USER_SESSION_EVENT,
  readFimbaUserSession,
} from "../utils/fimbaUserSession";

/** Hook reactivo sobre localStorage.fimba_user. */
export function useFimbaUserSession() {
  const [session, setSession] = useState(() => readFimbaUserSession());

  useEffect(() => {
    const sync = () => setSession(readFimbaUserSession());
    window.addEventListener(FIMBA_USER_SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FIMBA_USER_SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return session;
}
