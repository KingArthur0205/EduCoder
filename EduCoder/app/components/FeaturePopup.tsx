import React from 'react';

interface FeaturePopupProps {
  code: string;
  definition: string;
  example1: string;
  nonexample1: string;
  onClose: () => void;
  position: { x: number; y: number };
}

const FeaturePopup: React.FC<FeaturePopupProps> = ({
  code,
  definition,
  example1,
  nonexample1,
  onClose,
  position,
}) => {
  // Sanitize the texts
  const sanitizedDefinition = definition ? String(definition).replace(/[<>]/g, '') : 'No definition available';
  const sanitizedExample = example1 ? String(example1).replace(/[<>]/g, '') : 'No example available';
  const sanitizedNonExample = nonexample1 ? String(nonexample1).replace(/[<>]/g, '') : 'No non-example available';

  return (
    <div
      className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 max-w-md"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, 0)',
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-lg text-blue-600">{code}</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="mt-2">
        <h4 className="font-semibold mb-2 text-gray-700">Definition:</h4>
        <div className="text-sm text-gray-600 whitespace-pre-wrap mb-4">
          {sanitizedDefinition}
        </div>

        <h4 className="font-semibold mb-2 text-gray-700">Example:</h4>
        <div className="text-sm text-gray-600 whitespace-pre-wrap mb-4">
          {sanitizedExample}
        </div>

        <h4 className="font-semibold mb-2 text-gray-700">Non-Example:</h4>
        <div className="text-sm text-gray-600 whitespace-pre-wrap">
          {sanitizedNonExample}
        </div>
      </div>
    </div>
  );
};

export default FeaturePopup; 