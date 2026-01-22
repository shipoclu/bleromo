import React from 'react';

interface PollComposerProps {
  options: string[];
  onOptionChange: (index: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
}

const PollComposer: React.FC<PollComposerProps> = ({ options, onOptionChange, onAddOption, onRemoveOption }) => {
  const canRemove = options.length > 2;

  return (
    <div style={{ border: '2px inset #c0c0c0', padding: '6px', backgroundColor: '#ffffff' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Poll Options</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {options.map((option, index) => (
          <div key={`poll-option-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="text"
              value={option}
              onChange={(e) => onOptionChange(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              style={{
                flex: 1,
                padding: '4px',
                border: '2px inset #c0c0c0',
                fontSize: '12px',
                fontFamily: 'var(--win98-font)'
              }}
            />
            <button
              onClick={() => onRemoveOption(index)}
              disabled={!canRemove}
              style={{
                padding: '2px 6px',
                fontSize: '12px',
                border: '2px outset #c0c0c0',
                backgroundColor: '#c0c0c0',
                cursor: canRemove ? 'pointer' : 'default',
                opacity: canRemove ? 1 : 0.6
              }}
              title={canRemove ? 'Remove option' : 'At least two options are required'}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '8px' }}>
        <button
          onClick={onAddOption}
          style={{
            padding: '2px 8px',
            fontSize: '12px',
            border: '2px outset #c0c0c0',
            backgroundColor: '#c0c0c0',
            cursor: 'pointer'
          }}
        >
          Add Option
        </button>
      </div>
    </div>
  );
};

export default PollComposer;
