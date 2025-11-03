import React, { useState, useRef } from "react";
import "../css/pantry.css";

export default function Pantry({
  placeholder = "No items in pantry yet",
  initial = [],
  onChange = () => {},
}) {

    const [items, setItems] = useState(initial);
    const [value, setValue] = useState("");
    const [searchValue, setSearchValue] = useState("");
    const inputRef = useRef(null);

    function addItem(text) {
      const trimmed = String(text).trim();
      if (!trimmed) return;
      if (items.includes(trimmed)){
        setValue("");
        return;
      }
      const next = [...items, trimmed];
      setItems(next);
      onChange(next);
      setValue("");
      inputRef.current?.focus();
    }

    function removeItem(index) {
      const next = items.filter((_, i) => i !== index);
      setItems(next);
      onChange(next);
      inputRef.current?.focus();
    }

    function handleKeyDown(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addItem(value);
      }
    }

  return (
    <div className="pantry-container">
      <h1>Pantry</h1>

      <input
        className="pantry-search"
        placeholder="Start typing to search"
        type="text"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
      />

      <div className="pantry-box">
        <div className="pantry-list">
          {items.length === 0 ? (
            <div>{placeholder}</div>
          ) : (
            (() => {
              const filteredItems = items.filter((item) =>
                item.toLowerCase().includes(searchValue.toLowerCase())
              );

              if (filteredItems.length === 0 && searchValue.trim() !== "") {
                return <div>No items match your search.</div>;
              }

              return filteredItems.map((item, index) => (
                <div className="pantry-item" key={index}>
                  {item}
                  <button
                    className="remove-button"
                    onClick={() => removeItem(index)}
                  >
                    X
                  </button>
                </div>
              ));
            })()
          )}
        </div>
      </div>

      <div className="pantry-input-container">
        <input
          className="pantry-input"
          ref={inputRef}
          type="text"
          value={value}
          placeholder="Type to add an item"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="add-button" onClick={() => addItem(value)}>
          Add
        </button>
      </div>
    </div>
  );

}
