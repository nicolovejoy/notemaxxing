interface ColorPickerProps {
  colors: readonly string[];
  selected: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

export function ColorPicker({ 
  colors, 
  selected, 
  onChange, 
  label = "Color",
  className = ""
}: ColorPickerProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="grid grid-cols-4 gap-2">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={`${color} h-10 rounded-md hover:opacity-80 transition-opacity ${
              selected === color ? 'ring-2 ring-offset-2 ring-gray-800' : ''
            }`}
            aria-label={`Select ${color} color`}
          />
        ))}
      </div>
    </div>
  );
}