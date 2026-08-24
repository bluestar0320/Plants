import type { Plant } from '../types';
import { daysUntilNextWatering, formatDate, formatDaysLeft, waterStatus } from '../lib/date';

const STATUS_LABEL: Record<string, string> = {
  overdue: '물 주세요!',
  today: '오늘 물주기',
  soon: '곧 물주기',
  ok: '건강해요',
};

interface Props {
  plant: Plant;
  onWater: (id: string) => void;
  onEdit: (plant: Plant) => void;
  onDelete: (id: string) => void;
}

export default function PlantCard({ plant, onWater, onEdit, onDelete }: Props) {
  const daysLeft = daysUntilNextWatering(plant.lastWateredAt, plant.wateringIntervalDays);
  const status = waterStatus(daysLeft);

  return (
    <li className={`plant-card status-${status}`}>
      <div className="plant-card-top">
        {plant.photo ? (
          <img className="plant-photo" src={plant.photo} alt="" />
        ) : (
          <span className="plant-emoji" aria-hidden="true">
            {plant.emoji}
          </span>
        )}
        <div className="plant-info">
          <h3>{plant.name}</h3>
          {(plant.species || plant.location) && (
            <p className="plant-meta">
              {[plant.species, plant.location].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <span className={`status-badge status-${status}`}>{STATUS_LABEL[status]}</span>
      </div>

      <div className="plant-card-body">
        <p className="due-line">
          <strong>{formatDaysLeft(daysLeft)}</strong>
          <span className="dim"> · {plant.wateringIntervalDays}일마다</span>
        </p>
        <p className="dim small">마지막 급수: {formatDate(plant.lastWateredAt)}</p>
        {plant.notes && <p className="plant-notes">{plant.notes}</p>}
      </div>

      <div className="plant-card-actions">
        <button type="button" className="btn primary" onClick={() => onWater(plant.id)}>
          💧 물 줬어요
        </button>
        <button type="button" className="btn ghost" onClick={() => onEdit(plant)}>
          수정
        </button>
        <button type="button" className="btn ghost danger" onClick={() => onDelete(plant.id)}>
          삭제
        </button>
      </div>
    </li>
  );
}
