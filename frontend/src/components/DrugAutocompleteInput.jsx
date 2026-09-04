import React, { useState, useEffect, useRef } from 'react';
import { fetchDrugAutocomplete } from '../services/api';

export default function DrugAutocompleteInput({ label, id, value, onChange, placeholder, onSelectSuggestion, onKeyDown }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Fetch autocomplete options on typing or clicking
  const loadSuggestions = async (searchTerm) => {
    const query = searchTerm ? searchTerm.trim() : "";
    try {
      const data = await fetchDrugAutocomplete(query || "a", 10);
      if (data.drugs && data.drugs.length > 0) {
        setSuggestions(data.drugs);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Autocomplete fetch error:", err);
    }
  };

  useEffect(() => {
    if (!value || value.trim().length === 0) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      loadSuggestions(value);
    }, 150);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputClick = async () => {
    await loadSuggestions(value);
    setIsOpen(true);
  };

  return (
    <div className="input-group" ref={wrapperRef}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className="autocomplete-wrapper">
        <input
          type="text"
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            // Dropdown remains open only if user is actively clicked into the field
          }}
          onClick={handleInputClick}
          placeholder={placeholder}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
            if (onKeyDown) onKeyDown(e);
          }}
        />
        {isOpen && suggestions.length > 0 && (
          <div className="suggestions-dropdown fade-in">
            {suggestions.map((drug) => (
              <div
                key={drug.id}
                className="suggestion-item"
                onClick={() => {
                  onChange(drug.name);
                  if (onSelectSuggestion) onSelectSuggestion(drug.name);
                  setIsOpen(false);
                }}
              >
                {drug.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
