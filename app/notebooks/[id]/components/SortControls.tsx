import { useState } from 'react';
import { Search, Filter, SortAsc, ChevronDown, Clock, Calendar } from 'lucide-react';
import { SORT_OPTIONS } from '@/lib/constants';
import { Button } from '@/components/ui';

interface SortControlsProps {
  sortOption: string;
  onSortChange: (option: string) => void;
  onSearch?: (query: string) => void;
}

export function SortControls({ sortOption, onSortChange, onSearch }: SortControlsProps) {
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const sortOptions = [
    { value: SORT_OPTIONS.RECENT, label: 'Recently edited', icon: Clock },
    { value: SORT_OPTIONS.ALPHABETICAL, label: 'Alphabetical', icon: SortAsc },
    { value: SORT_OPTIONS.CREATED, label: 'Date created', icon: Calendar },
  ];

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search notes..."
          onChange={(e) => onSearch?.(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
          disabled={!onSearch}
        />
      </div>
      
      <Button variant="ghost" disabled>
        <Filter className="h-4 w-4" />
        Filter
      </Button>
      
      <div className="relative">
        <Button
          variant="ghost"
          onClick={() => setShowSortDropdown(!showSortDropdown)}
        >
          <SortAsc className="h-4 w-4" />
          Sort
          <ChevronDown className="h-4 w-4" />
        </Button>
        
        {showSortDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
            {sortOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => {
                  onSortChange(value);
                  setShowSortDropdown(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                  sortOption === value ? "bg-gray-50 font-medium" : ""
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}