import { clsx } from "clsx";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}

export const SearchInput = ({ value, onChange, placeholder, autoFocus }: SearchInputProps) => {
  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          className={clsx(
            "w-full h-12 bg-secondary border border-transparent rounded-xl",
            "px-4 pl-11 pr-10 text-sm text-foreground",
            "placeholder:text-muted-foreground",
            "focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
            "outline-none transition-all duration-200"
          )}
        />
        <svg 
          className="w-5 h-5 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-primary" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
