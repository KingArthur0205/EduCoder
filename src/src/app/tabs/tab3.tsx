"use client";
import { useEffect, useState } from "react";

interface Tab3Props {
  number: string | undefined;
}

export default function Tab3({ number }: Tab3Props) {
  const [content, setContent] = useState("");
  
  useEffect(() => {
    if (!number) return;
    
          fetch(`/api/transcript/t${number}?file=ccss.txt`)
      .then((res) => res.text())
      .then((text) => setContent(text))
      .catch((err) => console.error("Error loading text:", err));
  }, [number]); // Added number to dependency array
  
  // Function to parse and render markdown-style bold text
  const renderFormattedText = (text: string) => {
    // Split by bold markdown pattern
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
      // Check if this part is surrounded by ** **
      if (part.startsWith('**') && part.endsWith('**')) {
        // Remove the ** markers and wrap in strong tag
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      // Return regular text
      return <span key={index}>{part}</span>;
    });
  };
  
  return (
    <div>
      <h2 className="text-xl font-semibold text-black">Common Core State Standards</h2>
      <p className="text-black">{renderFormattedText(content)}</p>
    </div>
  );
}