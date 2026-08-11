/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { GoogleTasksWidget } from './components/GoogleTasksWidget';

function HealthWidget() {
  const [healthData, setHealthData] = useState<{
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
    database: string;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/v1/health');
        const json = await res.json();
        if (json.success) {
          setHealthData(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch health data', err);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!healthData) {
    return (
      <section className="col-span-4 row-span-2 bg-[#141417] border border-white/5 rounded-2xl p-6 flex flex-col justify-center items-center">
        <span className="text-gray-500 font-mono text-xs animate-pulse">Loading System Health...</span>
      </section>
    );
  }

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const formatMemory = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <section className="col-span-4 row-span-2 bg-[#141417] border border-white/5 rounded-2xl p-6 flex flex-col justify-between shadow-xl shadow-teal-900/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <div className="w-24 h-24 border border-teal-500 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
      </div>
      <div className="flex justify-between items-start relative z-10">
        <span className="text-[10px] font-bold uppercase tracking-widest text-teal-500">Live Health Check</span>
        <div className={`w-2 h-2 rounded-full ${healthData.database === 'Connected' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
      </div>
      
      <div className="mt-4 space-y-3 relative z-10">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span className="text-xs text-gray-400 font-mono">Uptime</span>
          <span className="text-xs font-mono text-white">{formatUptime(healthData.uptime)}</span>
        </div>
        
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span className="text-xs text-gray-400 font-mono">Mem (RSS)</span>
          <span className="text-xs font-mono text-white">{formatMemory(healthData.memory.rss)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400 font-mono">Database</span>
          <span className="text-xs font-mono text-teal-400">{healthData.database}</span>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white p-8 font-sans">
      <div className="max-w-[1024px] mx-auto flex flex-col">
        <header className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight uppercase leading-none">Enterprise Identity Service</h1>
            <p className="text-blue-400 font-mono text-xs mt-2 uppercase tracking-[0.2em]">Authentication • Authorization • Production Ready v1.0.4</p>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-gray-500 font-bold">System Status</span>
              <span className="text-green-400 font-mono text-sm">Operational // 99.99%</span>
            </div>
            <div className="w-px h-10 bg-white/10"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-gray-500 font-bold">Auth Latency</span>
              <span className="text-white font-mono text-sm">14ms (avg)</span>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-12 grid-rows-12 gap-4">
          <section className="col-span-5 row-span-3 bg-[#141417] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Architecture</span>
              <div className="bg-blue-500/10 text-blue-500 text-[10px] px-2 py-1 rounded border border-blue-500/20">CLEAN ARCHITECTURE</div>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold leading-tight">Modular Domain-Driven Design</h2>
              <div className="flex gap-2 flex-wrap">
                <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono">Middleware</span>
                <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono">Services</span>
                <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono">Repositories</span>
                <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono">Validators</span>
                <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono">Controllers</span>
              </div>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed">
              Decoupled layers ensuring database agnosticism and strict separation of concerns following SOLID principles.
            </div>
          </section>

          <section className="col-span-4 row-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-xl shadow-blue-900/20">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Security Posture</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-black">95%+</span>
              <span className="text-xs text-white/70">Test Coverage</span>
            </div>
            <div className="mt-4 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full w-[95%] bg-white"></div>
            </div>
            <p className="mt-4 text-xs text-white/80 font-medium">
              Full suite of Unit, Integration, and E2E tests using Vitest and Supertest.
            </p>
          </section>

          <section className="col-span-3 row-span-4 bg-[#141417] border border-white/5 rounded-2xl p-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Tech Stack</span>
            <div className="mt-6 space-y-6">
              {[
                { label: 'TypeScript', sub: 'Strict Mode', icon: 'TS' },
                { label: 'Zod', sub: 'Validation', icon: 'Z' },
                { label: 'JWT', sub: 'Auth Tokens', icon: 'J' },
                { label: 'Docker', sub: 'Orchestration', icon: 'D' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/5 rounded flex items-center justify-center font-bold text-lg">{item.icon}</div>
                  <div>
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="text-[10px] text-gray-500 uppercase">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="col-span-4 row-span-2 bg-[#141417] border border-white/5 rounded-2xl p-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Authorization</span>
            <h3 className="text-lg font-bold mt-2">RBAC / Middleware</h3>
            <ul className="mt-4 space-y-2 text-xs font-mono">
              <li className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-gray-400">role: Admin</span>
                <span className="text-orange-400">[*] all</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-gray-400">role: Manager</span>
                <span className="text-orange-400">[read, update]</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-400">role: User</span>
                <span className="text-orange-400">[read_own]</span>
              </li>
            </ul>
          </section>

          <section className="col-span-5 row-span-3 bg-[#0C0C0E] border border-blue-500/30 rounded-2xl p-6 font-mono text-[11px] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <div className="w-32 h-32 border-4 border-white rounded-full"></div>
            </div>
            <div className="flex gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
              <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
            </div>
            <div className="text-blue-400">POST</div>
            <div className="text-white">/api/v1/auth/login</div>
            <div className="text-gray-500 mt-2">{/* Body Validation via Zod */}</div>
            <div className="text-purple-400 mt-1">const loginSchema = z.object({'{'} ... {'}'});</div>
            <div className="text-gray-500 mt-2">{/* Token Rotation Strategy */}</div>
            <div className="text-green-400 mt-1">return {'{'} accessToken, refreshToken {'}'};</div>
          </section>

          <section className="col-span-4 row-span-2 bg-[#141417] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex justify-between">
               <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Security Middleware</span>
               <span className="text-emerald-500">🛡️</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-white/5 p-2 rounded">Helmet.js</div>
              <div className="bg-white/5 p-2 rounded">CORS Config</div>
              <div className="bg-white/5 p-2 rounded">Rate Limiter</div>
              <div className="bg-white/5 p-2 rounded">HPKP/HSTS</div>
            </div>
          </section>

          <section className="col-span-3 row-span-2 bg-white text-black rounded-2xl p-6 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Deployment</span>
            <div className="flex flex-col">
              <span className="text-2xl font-bold italic tracking-tighter">Docker Optimized</span>
              <span className="text-[10px] font-mono mt-1 opacity-60">Alpine Linux // Multi-stage</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full border border-white bg-blue-500"></div>
                <div className="w-6 h-6 rounded-full border border-white bg-indigo-500"></div>
                <div className="w-6 h-6 rounded-full border border-white bg-gray-900"></div>
              </div>
              <span className="text-[10px] font-bold">CI/CD READY</span>
            </div>
          </section>

          <HealthWidget />
          <GoogleTasksWidget />
        </main>
      </div>
    </div>
  );
}

