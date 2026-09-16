import { useState } from 'react';
import type { Command, EngineState } from '@cueclock/shared';

interface Props {
  state: EngineState;
  sendCommand: (c: Command) => void;
}

export function MessagePanel({ state, sendCommand }: Props) {
  const [customText, setCustomText] = useState('');
  const [newQuickMessage, setNewQuickMessage] = useState('');

  function send(text: string) {
    sendCommand({ type: 'setMessage', text });
  }

  return (
    <section className="panel">
      <h2>Message to Display</h2>

      {state.message && (
        <div className="message-panel__current">
          Showing: “{state.message}”
          <button className="btn btn--chip" onClick={() => send('')}>
            Clear
          </button>
        </div>
      )}

      <div className="message-panel__compose">
        <input
          className="text-input"
          placeholder="Type a message to show on the display…"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && customText.trim()) {
              send(customText.trim());
              setCustomText('');
            }
          }}
        />
        <button
          className="btn btn--primary"
          disabled={!customText.trim()}
          onClick={() => {
            send(customText.trim());
            setCustomText('');
          }}
        >
          Send
        </button>
      </div>

      {state.quickMessages.length > 0 && (
        <div className="message-panel__quick">
          {state.quickMessages.map((m) => (
            <div key={m.id} className="chip-with-delete">
              <button className="btn btn--chip" onClick={() => send(m.text)}>
                {m.text}
              </button>
              <button
                className="chip-with-delete__remove"
                title="Delete this quick message"
                onClick={() => sendCommand({ type: 'deleteQuickMessage', id: m.id })}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="message-panel__add">
        <input
          className="text-input"
          placeholder="Save a new quick message…"
          value={newQuickMessage}
          onChange={(e) => setNewQuickMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newQuickMessage.trim()) {
              sendCommand({ type: 'saveQuickMessage', text: newQuickMessage.trim() });
              setNewQuickMessage('');
            }
          }}
        />
        <button
          className="btn btn--secondary"
          disabled={!newQuickMessage.trim()}
          onClick={() => {
            sendCommand({ type: 'saveQuickMessage', text: newQuickMessage.trim() });
            setNewQuickMessage('');
          }}
        >
          Save
        </button>
      </div>
    </section>
  );
}
