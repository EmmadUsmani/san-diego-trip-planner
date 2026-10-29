import { useAuth } from "../api/hooks";

/** True when the viewer is logged in. Disable edit controls (and show "Log in to edit") when false. */
export function useCanEdit(): boolean {
  return useAuth().data?.authenticated === true;
}
