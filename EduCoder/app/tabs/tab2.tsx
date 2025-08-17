"use client"; // Ensure it's a Client Component

import { useEffect, useState } from "react";

interface Tab2Props {
  number: string | undefined;
}

export default function Tab2({ number }: Tab2Props) {
  const [content, setContent] = useState("");
  
  useEffect(() => {
    if (!number) return; // Ensure the number is available
    
            fetch(`/api/transcript/t${number}?file=learning_goals.txt`) // Fetch from API
      .then((res) => res.text())
      .then((text) => setContent(text));
  }, [number]); // Add number to the dependency array
  
  return (
    <div>
      <h2 className="text-xl font-semibold text-black">Learning Goals</h2>
      <p className="text-black">
        {content.split("\n").map((line, index) => (
          <span key={index}>
            {line}
            <br />
          </span>
        ))}
      </p>
    </div>
  );
}