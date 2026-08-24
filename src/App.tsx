import { useEffect, useMemo, useState } from 'react';
import type { Plant, PlantDraft } from './types';
import { loadPlants, savePlants } from './lib/storage';
import { seedPlants } from './lib/seed';
import { daysUntilNextWatering, todayISO } from './lib/date';
import {
  getPermission,
  isEnabled,
  notificationsSupported,
  notifyDuePlants,
  requestPermission,
  setEnabled,
} from './lib/notifications';
import PlantCard from './components/PlantCard';
import PlantForm from './components/PlantForm';
import Modal from './components/Modal';
import './App.css';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

const SEEDED_KEY = 'plants.app.seeded.v1';

export default function App() {
  const [plants, setPlants] = useState<Plant[]>(() => {
    const stored = loadPlants();
    if (stored.length > 0) return stored;
    if (localStorage.getItem(SEEDED_KEY)) return [];
    return seedPlants();
  });
  const [isAdding, setIsAdding] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [notifPermission, setNotifPermission] = useState(getPermission());
  const [notifEnabled, setNotifEnabled] = useState(isEnabled());

  useEffect(() => {
    savePlants(plants);
    localStorage.setItem(SEEDED_KEY, '1');
  }, [plants]);

  useEffect(() => {
    if (!notifEnabled || notifPermission !== 'granted') return;
    notifyDuePlants(plants);
    const id = window.setInterval(() => notifyDuePlants(plants), CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [notifEnabled, notifPermission, plants]);

  const handleToggleNotifications = async () => {
    if (notifEnabled) {
      setNotifEnabled(false);
      setEnabled(false);
      return;
    }
    const permission = await requestPermission();
    setNotifPermission(permission);
    if (permission === 'granted') {
      setNotifEnabled(true);
      setEnabled(true);
    }
  };

  const sortedPlants = useMemo(
    () =>
      [...plants].sort((a, b) => {
        const da = daysUntilNextWatering(a.lastWateredAt, a.wateringIntervalDays);
        const db = daysUntilNextWatering(b.lastWateredAt, b.wateringIntervalDays);
        return da - db;
      }),
    [plants],
  );

  const stats = useMemo(() => {
    let overdue = 0;
    let dueToday = 0;
    for (const p of plants) {
      const d = daysUntilNextWatering(p.lastWateredAt, p.wateringIntervalDays);
      if (d < 0) overdue += 1;
      else if (d === 0) dueToday += 1;
    }
    return { total: plants.length, overdue, dueToday };
  }, [plants]);

  const handleAdd = (draft: PlantDraft) => {
    const newPlant: Plant = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: todayISO(),
      waterCount: 0,
    };
    setPlants((prev) => [...prev, newPlant]);
    setIsAdding(false);
  };

  const handleEditSubmit = (draft: PlantDraft) => {
    if (!editingPlant) return;
    setPlants((prev) =>
      prev.map((p) => (p.id === editingPlant.id ? { ...p, ...draft } : p)),
    );
    setEditingPlant(null);
  };

  const handleWater = (id: string) => {
    setPlants((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, lastWateredAt: todayISO(), waterCount: p.waterCount + 1 }
          : p,
      ),
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm('이 식물을 목록에서 삭제할까요?')) return;
    setPlants((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-emoji" aria-hidden="true">
            🌱
          </span>
          <div>
            <h1>내 식물 관리</h1>
            <p className="tagline">물 줄 때를 놓치지 않도록 도와드릴게요</p>
          </div>
        </div>
        <div className="header-actions">
          {notificationsSupported() && notifPermission !== 'denied' && (
            <button type="button" className="btn ghost" onClick={handleToggleNotifications}>
              {notifEnabled ? '🔔 알림 켜짐' : '🔕 알림 받기'}
            </button>
          )}
          <button type="button" className="btn primary" onClick={() => setIsAdding(true)}>
            + 식물 추가
          </button>
        </div>
      </header>

      {notificationsSupported() && notifPermission === 'denied' && (
        <p className="notif-hint">
          브라우저 알림이 차단되어 있어요. 물주기 알림을 받으려면 브라우저 사이트 설정에서 알림을 허용해주세요.
        </p>
      )}
      {notifEnabled && notifPermission === 'granted' && (
        <p className="notif-hint">이 앱 탭이 열려 있는 동안에만 물주기 알림을 받을 수 있어요.</p>
      )}

      {plants.length > 0 && (
        <section className="stats" aria-label="요약">
          <div className="stat-card">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">전체 식물</span>
          </div>
          <div className="stat-card stat-overdue">
            <span className="stat-value">{stats.overdue}</span>
            <span className="stat-label">물 필요해요</span>
          </div>
          <div className="stat-card stat-today">
            <span className="stat-value">{stats.dueToday}</span>
            <span className="stat-label">오늘 급수</span>
          </div>
        </section>
      )}

      {plants.length === 0 ? (
        <div className="empty-state">
          <p className="empty-emoji">🪴</p>
          <h2>아직 등록된 식물이 없어요</h2>
          <p>식물을 추가하고 물주기 주기를 관리해보세요.</p>
          <button type="button" className="btn primary" onClick={() => setIsAdding(true)}>
            첫 식물 추가하기
          </button>
        </div>
      ) : (
        <ul className="plant-list">
          {sortedPlants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onWater={handleWater}
              onEdit={setEditingPlant}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}

      {isAdding && (
        <Modal title="식물 추가" onClose={() => setIsAdding(false)}>
          <PlantForm submitLabel="추가하기" onCancel={() => setIsAdding(false)} onSubmit={handleAdd} />
        </Modal>
      )}

      {editingPlant && (
        <Modal title="식물 정보 수정" onClose={() => setEditingPlant(null)}>
          <PlantForm
            initial={editingPlant}
            submitLabel="저장하기"
            onCancel={() => setEditingPlant(null)}
            onSubmit={handleEditSubmit}
          />
        </Modal>
      )}
    </div>
  );
}
