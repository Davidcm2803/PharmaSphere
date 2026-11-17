import { useSyncExternalStore } from "react";

// Lee los tokens brand-* del CSS
const VARS = ["--color-brand-primary-light", "--color-brand-primary", "--color-brand-primary-dark", "--color-brand-accent-deep"];
const subscribe = (cb) => {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
};
const read = () => {
  const s = getComputedStyle(document.documentElement);
  return VARS.map((v) => s.getPropertyValue(v).trim()).join("|");
};
export default function useBrandColors() {
  return useSyncExternalStore(subscribe, read, () => "").split("|").filter(Boolean);
}