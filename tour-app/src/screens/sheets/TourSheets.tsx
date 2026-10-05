import { useEffect, useRef } from 'react';
import communityPhoto from '~/assets/images/community-pool.jpg';
import { Icon } from '~/components/Icon';
import { Button, IconButton, Modal, Sheet } from '~/components/ui';
import { useKeyboardInset } from '~/hooks/useDevice';
import type { HelpItem } from '~/models';
import type { AiMessage } from '~/store/appState';
import type { TourStopView } from '~/store/selectors';

export const HelpSheet = ({ open, items, expanded, supportEmail, onToggle, onClose }: { open: boolean; items: HelpItem[]; expanded: Record<string, boolean>; supportEmail: string; onToggle: (id: string) => void; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} title="Help & Support">
    <div className="pw-help">
      {items.map((item) => (
        <div key={item.id} className="pw-help__item">
          <button type="button" className="pw-help__q" onClick={() => onToggle(item.id)} aria-expanded={!!expanded[item.id]}>
            <span>{item.question}</span>
            <Icon name="chevronDown" size={16} color="var(--pw-text-subtle)" style={{ transform: expanded[item.id] ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
          </button>
          {expanded[item.id] ? <div className="pw-help__a">{item.answer}</div> : null}
        </div>
      ))}
      <div className="pw-help__contact">
        <div>Contact Support</div>
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
      </div>
    </div>
  </Sheet>
);

export const ItinerarySheet = ({ open, stops, stopIndex, onAdd, onJump, onClose }: { open: boolean; stops: TourStopView[]; stopIndex: number; onAdd: () => void; onJump: (node: string) => void; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} title={<span className="pw-sheet__title--18">Tour Itinerary</span>} size="scroll">
    <div className="pw-itin">
      {stops.length ? (
        stops.map((s, i) => (
          <button key={s.node} type="button" className="pw-itin__row" onClick={() => onJump(s.node)}>
            {i < stopIndex ? (
              <span className="pw-itin__done">
                <Icon name="check" size={11} color="#fff" strokeWidth={3} />
              </span>
            ) : i === stopIndex ? (
              <span className="pw-itin__current" />
            ) : (
              <span className="pw-itin__upcoming" />
            )}
            <span className="pw-itin__text">
              <span className="pw-itin__name">{s.name}</span>
              <span className="pw-itin__meta">
                {s.kind === 'unit' ? s.floorLabel : s.floor} · {s.duration} min
              </span>
            </span>
          </button>
        ))
      ) : (
        <div className="pw-itin__empty">No stops on this tour yet.</div>
      )}
    </div>
    <Button variant="soft" height={46} onClick={onAdd}>
      Add Another Stop
    </Button>
  </Sheet>
);

export const AddStopSheet = ({ open, stops, onAdd, onClose }: { open: boolean; stops: TourStopView[]; onAdd: (node: string) => void; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} title={<span className="pw-sheet__title--18">Add A Stop</span>} zIndex={310}>
    <div className="pw-itin">
      {stops.length ? (
        stops.map((s) => (
          <button key={s.node} type="button" className="pw-itin__row pw-itin__row--add" onClick={() => onAdd(s.node)}>
            <span className="pw-itin__text">
              <span className="pw-itin__name">{s.name}</span>
              <span className="pw-itin__meta">
                {s.kind === 'unit' ? s.floorLabel : s.floor} · {s.duration} min
              </span>
            </span>
            <Icon name="plus" size={18} color="var(--pw-primary)" />
          </button>
        ))
      ) : (
        <div className="pw-itin__empty">Every stop is already on your tour.</div>
      )}
    </div>
  </Sheet>
);

export const NoteSheet = ({ open, stopName, draft, onChange, onSave, onClose }: { open: boolean; stopName: string; draft: string; onChange: (value: string) => void; onSave: () => void; onClose: () => void }) => {
  const inset = useKeyboardInset();
  return (
    <Sheet open={open} onClose={onClose} title={<span className="pw-sheet__title--18">Add Note — {stopName}</span>} keyboardInset={inset}>
      <textarea value={draft} onChange={(e) => onChange(e.target.value)} placeholder="Jot down what you liked about this stop…" className="pw-textarea" aria-label="Note" autoFocus />
      <Button height={48} onClick={onSave}>
        Save
      </Button>
    </Sheet>
  );
};

export const VideoModal = ({ open, stopName, onClose }: { open: boolean; stopName: string; onClose: () => void }) => (
  <Modal open={open} onClose={onClose}>
    <IconButton icon="close" label="Close" tone="round" className="pw-video__close" onClick={onClose} />
    <img src={communityPhoto} alt="Video tour" className="pw-video__poster" />
    <div className="pw-video__caption">Video Tour — {stopName} *</div>
  </Modal>
);

interface AiProps {
  open: boolean;
  propertyName: string;
  messages: AiMessage[];
  typing: boolean;
  input: string;
  prompts: { label: string; question: string }[];
  onInput: (value: string) => void;
  onSend: (text?: string) => void;
  onHuman: () => void;
  onClose: () => void;
}

export const AiChatSheet = ({ open, propertyName, messages, typing, input, prompts, onInput, onSend, onHuman, onClose }: AiProps) => {
  const list = useRef<HTMLDivElement>(null);
  const inset = useKeyboardInset();
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing, open]);
  return (
    <Sheet open={open} onClose={onClose} size="tall" zIndex={320} className="pw-ai">
      <div className="pw-ai__head">
        <div className="pw-ai__who">
          <span className="pw-ai__avatar">
            <Icon name="sparkle" size={16} color="var(--pw-label-yellow)" />
          </span>
          <div>
            <div className="pw-ai__title">AI Concierge</div>
            <div className="pw-ai__online">● Online · {propertyName}</div>
          </div>
        </div>
        <IconButton icon="close" label="Close" tone="round" onClick={onClose} />
      </div>
      <div ref={list} className="pw-ai__messages">
        {messages.map((m, i) => (
          <div key={i} className={`pw-ai__bubble pw-ai__bubble--${m.role}`}>
            {m.text}
          </div>
        ))}
        {typing ? <div className="pw-ai__bubble pw-ai__bubble--typing">Typing…</div> : null}
      </div>
      <div className="pw-ai__prompts">
        {prompts.map((p) => (
          <button key={p.label} type="button" onClick={() => onSend(p.question)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="pw-ai__human">
        <Button variant="dark" height={40} icon="people" iconSize={15} onClick={onHuman}>
          Talk to a Human
        </Button>
      </div>
      <form
        className="pw-ai__compose"
        style={{ paddingBottom: inset ? inset + 12 : undefined }}
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <input value={input} onChange={(e) => onInput(e.target.value)} placeholder="Ask about pricing, pets, parking…" className="pw-input pw-input--chat" enterKeyHint="send" aria-label="Message" />
        <button type="submit" className="pw-ai__send" aria-label="Send" disabled={!input.trim()}>
          <Icon name="send" size={18} color="#fff" />
        </button>
      </form>
      <div className="pw-ai__spacer" />
    </Sheet>
  );
};
