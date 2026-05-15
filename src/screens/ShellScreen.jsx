import { clearToken } from '../lib/session.js';

export default function ShellScreen({ playerId, onLogout }) {
  function handleLogout() {
    clearToken();
    onLogout();
  }

  return (
    <div className="min-h-dvh bg-hm-bg flex flex-col">
      <header className="border-b border-hm-dim px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-black tracking-tight text-hm-white">
          HUMON<span className="text-hm-red">DIAL</span>
          <span className="text-xs font-normal text-hm-muted ml-2">2026</span>
        </h1>
        <button
          onClick={handleLogout}
          className="text-xs text-hm-muted hover:text-hm-white"
        >
          יציאה
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center text-hm-muted text-sm">
        <div className="text-center">
          <div className="text-4xl mb-4">⚽</div>
          <p>משחקים עוד קצת — בקרוב!</p>
          <p className="text-xs mt-2 font-mono opacity-50">{playerId}</p>
        </div>
      </main>
    </div>
  );
}
