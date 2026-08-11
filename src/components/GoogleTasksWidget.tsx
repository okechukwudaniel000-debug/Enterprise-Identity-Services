import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout, getAccessToken } from '../lib/firebase';

interface Task {
  id: string;
  title: string;
  status: string;
}

interface TaskList {
  id: string;
  title: string;
}

export function GoogleTasksWidget() {
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (u, token) => {
        setUser(u);
        setNeedsAuth(false);
        fetchTaskLists(token);
      },
      () => setNeedsAuth(true)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedList && !needsAuth) {
      fetchTasks(selectedList);
    }
  }, [selectedList, needsAuth]);

  const fetchTaskLists = async (token: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.items) {
        setTaskLists(data.items);
        if (data.items.length > 0) {
          setSelectedList(data.items[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch task lists', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTasks = async (listId: string) => {
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTasks(data.items || []);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        fetchTaskLists(result.accessToken);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setTasks([]);
    setTaskLists([]);
  };

  return (
    <section className="col-span-5 row-span-5 bg-[#141417] border border-white/5 rounded-2xl p-6 flex flex-col relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Google Tasks</span>
        {user ? (
          <button 
            onClick={handleLogout}
            className="text-[10px] text-gray-500 hover:text-white transition-colors uppercase"
          >
            Sign out
          </button>
        ) : null}
      </div>

      {needsAuth || !user ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-gray-400 text-center">Connect your Google Workspace to manage tasks directly from the dashboard.</p>
          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="bg-white text-black px-4 py-2 rounded font-semibold text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            {isLoggingIn ? 'Connecting...' : 'Connect Google Tasks'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {taskLists.length > 0 && (
            <select 
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white mb-4 outline-none focus:border-indigo-500"
              value={selectedList || ''}
              onChange={(e) => setSelectedList(e.target.value)}
            >
              {taskLists.map(list => (
                <option key={list.id} value={list.id} className="bg-[#141417]">{list.title}</option>
              ))}
            </select>
          )}

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {isLoading ? (
              <div className="text-center text-xs text-gray-500 py-4 animate-pulse">Loading tasks...</div>
            ) : tasks.length > 0 ? (
              tasks.map(task => (
                <div key={task.id} className="bg-white/5 border border-white/5 rounded p-3 flex gap-3 items-start">
                  <div className={`mt-1 w-4 h-4 rounded-sm border ${task.status === 'completed' ? 'bg-indigo-500 border-indigo-500' : 'border-gray-500'}`}></div>
                  <div className="flex-1">
                    <p className={`text-sm ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}`}>
                      {task.title}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-xs text-gray-500 py-4">No tasks found in this list.</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
