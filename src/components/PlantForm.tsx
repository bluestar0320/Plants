import { useState } from 'react';
import type { FormEvent } from 'react';
import type { LightNeed, PlantDraft } from '../types';
import { todayISO } from '../lib/date';

const EMOJI_OPTIONS = ['🪴', '🌱', '🌿', '🌵', '🌳', '🌲', '🍀', '🌾', '🪻', '🌷', '🌻'];

const LIGHT_LABELS: Record<LightNeed, string> = {
  low: '음지',
  medium: '반양지',
  high: '양지',
};

interface Props {
  initial?: PlantDraft;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (draft: PlantDraft) => void;
}

export default function PlantForm({ initial, submitLabel, onCancel, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [species, setSpecies] = useState(initial?.species ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? EMOJI_OPTIONS[0]);
  const [interval, setInterval] = useState(initial?.wateringIntervalDays ?? 7);
  const [lastWateredAt, setLastWateredAt] = useState(initial?.lastWateredAt ?? todayISO());
  const [light, setLight] = useState<LightNeed>(initial?.light ?? 'medium');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    if (interval < 1) {
      setError('물주기 주기는 1일 이상이어야 해요.');
      return;
    }
    onSubmit({
      name: name.trim(),
      species: species.trim() || undefined,
      location: location.trim() || undefined,
      emoji,
      wateringIntervalDays: interval,
      lastWateredAt,
      light,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form className="plant-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="pf-name">이름 *</label>
        <input
          id="pf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 몬스테라"
          autoFocus
        />
      </div>

      <div className="field">
        <label>아이콘</label>
        <div className="emoji-picker">
          {EMOJI_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt}
              className={`emoji-option ${emoji === opt ? 'selected' : ''}`}
              onClick={() => setEmoji(opt)}
              aria-label={opt}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="pf-species">종류</label>
          <input
            id="pf-species"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            placeholder="예: Monstera deliciosa"
          />
        </div>
        <div className="field">
          <label htmlFor="pf-location">위치</label>
          <input
            id="pf-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="예: 거실 창가"
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="pf-interval">물주기 주기 (일)</label>
          <input
            id="pf-interval"
            type="number"
            min={1}
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="pf-last">마지막으로 물 준 날</label>
          <input
            id="pf-last"
            type="date"
            value={lastWateredAt}
            max={todayISO()}
            onChange={(e) => setLastWateredAt(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="pf-light">빛 요구량</label>
        <select
          id="pf-light"
          value={light}
          onChange={(e) => setLight(e.target.value as LightNeed)}
        >
          {(Object.keys(LIGHT_LABELS) as LightNeed[]).map((key) => (
            <option key={key} value={key}>
              {LIGHT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="pf-notes">메모</label>
        <textarea
          id="pf-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="관리 팁이나 특이사항을 적어두세요"
          rows={2}
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="btn primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
