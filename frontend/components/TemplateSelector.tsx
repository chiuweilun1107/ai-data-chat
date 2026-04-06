"use client";

import { useEffect, useRef, useState } from "react";
import type { Template } from "@/lib/types";

interface TemplateSelectorProps {
  templates: Template[];
  loading: boolean;
  onSelect: (template: Template) => void;
}

export default function TemplateSelector({
  templates,
  loading,
  onSelect,
}: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading || templates.length === 0) return null;

  // Group templates by chart_type
  const grouped = templates.reduce<Record<string, Template[]>>(
    (acc, template) => {
      const cat = template.chart_type || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(template);
      return acc;
    },
    {}
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="
          flex items-center gap-1 px-2 py-1 text-xs rounded
          text-text-hint hover:text-text-secondary hover:bg-surface-hover
          transition-colors duration-150
        "
        aria-label="Select template"
        aria-expanded={open}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect
            x="2"
            y="2"
            width="10"
            height="10"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M5 5h4M5 7h4M5 9h2"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </svg>
        Templates
      </button>

      {open && (
        <div
          className="
            absolute bottom-full left-0 mb-1 w-64
            bg-surface-card border border-surface-border rounded-card
            shadow-lg overflow-hidden z-50
          "
          role="listbox"
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="px-3 py-1.5 text-[10px] text-text-hint uppercase tracking-wider">
                  {category}
                </div>
                {items.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      onSelect(template);
                      setOpen(false);
                    }}
                    className="
                      w-full text-left px-3 py-2
                      hover:bg-surface-hover transition-colors
                    "
                    role="option"
                    aria-selected={false}
                  >
                    <div className="text-xs text-text-primary">
                      {template.name}
                    </div>
                    {template.style_description && (
                      <div className="text-[10px] text-text-hint mt-0.5 truncate">
                        {template.style_description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
