import { createContext } from "react";

export const userInfoContext = createContext({
  value: JSON.parse(localStorage.getItem('userInfo') || 'null'),
  set: () => {}
});
