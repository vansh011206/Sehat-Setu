import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 text-xs text-slate-500 font-medium ${className}`}
    >
      <Link
        to="/dashboard"
        className="flex items-center gap-1 text-slate-500 hover:text-teal-800 transition-colors"
      >
        <Home size={14} />
        <span>Home</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-1.5">
            <ChevronRight size={12} className="text-slate-400 shrink-0" />
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="text-slate-500 hover:text-teal-800 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-900 font-semibold">{item.label}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
