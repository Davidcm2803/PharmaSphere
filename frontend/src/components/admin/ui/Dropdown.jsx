import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { cn } from "../../../lib/utils";

const classNames = (error) => ({
  control: ({ isFocused }) =>
    cn(
      "min-h-11 w-full cursor-pointer rounded-lg border bg-brand-card px-1 text-base transition-colors sm:text-sm",
      error
        ? "border-brand-danger"
        : isFocused
          ? "border-brand-primary"
          : "border-brand-border hover:border-brand-primary",
    ),
  valueContainer: () => "gap-1 px-2.5 py-1",
  singleValue: () => "text-brand-foreground",
  placeholder: () => "text-brand-muted-foreground",
  input: () => "text-brand-foreground",
  indicatorSeparator: () => "hidden",
  dropdownIndicator: ({ isFocused }) =>
    cn("px-2 text-brand-muted-foreground", isFocused && "text-brand-primary"),
  clearIndicator: () => "px-2 text-brand-muted-foreground hover:text-brand-danger",
  loadingIndicator: () => "px-2 text-brand-muted-foreground",
  menu: () =>
    "mt-1 overflow-hidden rounded-xl border border-brand-border bg-brand-card shadow-lg",
  menuList: () => "p-1",
  option: ({ isFocused, isSelected }) =>
    cn(
      "cursor-pointer rounded-lg px-3 py-2.5 text-base sm:text-sm",
      isSelected
        ? "bg-brand-primary text-white"
        : isFocused
          ? "bg-brand-muted text-brand-foreground"
          : "text-brand-foreground",
    ),
  noOptionsMessage: () => "px-3 py-2.5 text-sm text-brand-muted-foreground",
  loadingMessage: () => "px-3 py-2.5 text-sm text-brand-muted-foreground",
});

export default function Dropdown({
  options = [],
  value,
  onChange,
  creatable = false,
  error,
  placeholder = "Selecciona…",
  isClearable = true,
  isLoading = false,
  ...rest
}) {
  const hasValue = value !== null && value !== undefined && value !== "";
  const selected =
    options.find((o) => o.value === value) ??
    (creatable && hasValue ? { value, label: String(value) } : null);

  const Component = creatable ? CreatableSelect : Select;

  return (
    <Component
      unstyled
      classNames={classNames(error)}
      options={options}
      value={selected}
      onChange={(opt) => onChange(opt ? opt.value : creatable ? "" : null)}
      placeholder={placeholder}
      isClearable={isClearable}
      isLoading={isLoading}
      noOptionsMessage={() => "Sin resultados"}
      loadingMessage={() => "Cargando…"}
      formatCreateLabel={(v) => `Crear "${v}"`}
      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      menuPosition="fixed"
      styles={{ menuPortal: (base) => ({ ...base, zIndex: 60 }) }}
      {...rest}
    />
  );
}