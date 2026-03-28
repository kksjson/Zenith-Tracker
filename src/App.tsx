import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Calendar, 
  BookOpen, 
  Activity, 
  Settings, 
  Image as ImageIcon, 
  MessageSquare, 
  Wind, 
  Music, 
  ChevronRight,
  Brain,
  Quote,
  X,
  Send,
  Upload
} from 'lucide-react';
import { format, differenceInDays, parseISO, isSameDay } from 'date-fns';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { getGeminiResponse, getWellbeingQuote, analyzeSyllabus } from './lib/gemini';
import { extractDominantColor, getContrastColor } from './lib/theme';
import { AppMode, Habit, StudyTask, ExamInfo, UserState } from './types';

const STORAGE_KEY = 'zenith_user_state';

const DEFAULT_STATE: UserState = {
  mode: 'both',
  habits: [],
  exam: null,
  themeColor: '#6366f1',
  themeImage: null,
  lastCheckIn: null,
};

export default function App() {
  const [state, setState] = useState<UserState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_STATE;
  });
  const [showPreface, setShowPreface] = useState(!localStorage.getItem(STORAGE_KEY));
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInQuote, setCheckInQuote] = useState<{ quote: string; mood: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'zen' | 'settings'>('dashboard');
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hello! I am Zenith, your study companion. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Apply theme
    document.documentElement.style.setProperty('--primary', state.themeColor);
    document.documentElement.style.setProperty('--primary-foreground', getContrastColor(state.themeColor));
  }, [state]);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (state.lastCheckIn !== today) {
      setShowCheckIn(true);
    }
  }, []);

  const updateState = (updates: Partial<UserState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleModeToggle = (mode: AppMode) => {
    updateState({ mode });
  };

  const addHabit = (name: string) => {
    if (!name) return;
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name,
      completedDays: [],
      streak: 0
    };
    updateState({ habits: [...state.habits, newHabit] });
  };

  const toggleHabit = (id: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const newHabits = state.habits.map(h => {
      if (h.id === id) {
        const isCompleted = h.completedDays.includes(today);
        const completedDays = isCompleted 
          ? h.completedDays.filter(d => d !== today)
          : [...h.completedDays, today];
        return { ...h, completedDays };
      }
      return h;
    });
    updateState({ habits: newHabits });
  };

  const deleteHabit = (id: string) => {
    updateState({ habits: state.habits.filter(h => h.id !== id) });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const url = event.target?.result as string;
      const color = await extractDominantColor(url);
      updateState({ themeImage: url, themeColor: color });
    };
    reader.readAsDataURL(file);
  };

  const handleCheckIn = async (mood: string) => {
    setIsTyping(true);
    const quote = await getWellbeingQuote(mood);
    setCheckInQuote({ quote, mood });
    updateState({ lastCheckIn: format(new Date(), 'yyyy-MM-dd') });
    setIsTyping(false);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);
    const response = await getGeminiResponse(userMsg);
    setMessages(prev => [...prev, { role: 'ai', text: response }]);
    setIsTyping(false);
  };

  const handleSyllabusUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setIsTyping(true);
    const topics = await analyzeSyllabus(text);
    updateState({ 
      exam: { 
        name: state.exam?.name || 'Upcoming Exam',
        date: state.exam?.date || format(new Date(), 'yyyy-MM-dd'),
        syllabus: topics,
        completedTopics: []
      }
    });
    setIsTyping(false);
  };

  const toggleTopic = (topic: string) => {
    if (!state.exam) return;
    const completedTopics = state.exam.completedTopics.includes(topic)
      ? state.exam.completedTopics.filter(t => t !== topic)
      : [...state.exam.completedTopics, topic];
    updateState({ exam: { ...state.exam, completedTopics } });
  };

  if (showPreface) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Brain className="text-white w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Welcome to Zenith</h1>
            <p className="text-slate-500">How would you like to use your companion?</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              { id: 'habit', label: 'Habit Tracker', icon: Activity, desc: 'Build better daily routines' },
              { id: 'study', label: 'Study Tracker', icon: BookOpen, desc: 'Ace your exams and syllabus' },
              { id: 'both', label: 'Both', icon: Brain, desc: 'The ultimate productivity mix' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => handleModeToggle(m.id as AppMode)}
                className={cn(
                  "flex items-center p-4 rounded-2xl border-2 transition-all text-left",
                  state.mode === m.id ? "border-indigo-600 bg-indigo-50" : "border-slate-100 hover:border-indigo-200"
                )}
              >
                <div className={cn("p-3 rounded-xl mr-4", state.mode === m.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>
                  <m.icon size={24} />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{m.label}</div>
                  <div className="text-xs text-slate-500">{m.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowPreface(false)}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center group"
          >
            Get Started
            <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col transition-colors duration-500"
      style={{ 
        backgroundColor: state.themeImage ? 'transparent' : '#f8fafc',
        backgroundImage: state.themeImage ? `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${state.themeImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Brain size={20} />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">Zenith</span>
        </div>
        <nav className="hidden md:flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'zen', label: 'Zen Zone', icon: Wind },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <tab.icon size={16} className="mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{format(new Date(), 'EEEE')}</div>
            <div className="text-sm font-bold text-slate-900">{format(new Date(), 'MMMM do')}</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Habits & Progress */}
            <div className="lg:col-span-2 space-y-8">
              {/* Exam Tracker Section */}
              {(state.mode === 'study' || state.mode === 'both') && (
                <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        <Calendar size={20} />
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">Exam Tracker</h2>
                    </div>
                    {!state.exam ? (
                      <button 
                        onClick={() => updateState({ exam: { name: 'Final Exam', date: format(new Date(), 'yyyy-MM-dd'), syllabus: [], completedTopics: [] } })}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        Set Exam Date
                      </button>
                    ) : (
                      <div className="flex items-center space-x-4">
                        <label className="cursor-pointer flex items-center space-x-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                          <Upload size={16} />
                          <span>Upload Syllabus</span>
                          <input type="file" accept=".txt,.pdf" className="hidden" onChange={handleSyllabusUpload} />
                        </label>
                        <button onClick={() => updateState({ exam: null })} className="text-slate-400 hover:text-red-500">
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {state.exam && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="text-sm text-slate-500 mb-1 uppercase tracking-wider font-bold">Days Remaining</div>
                          <div className="text-4xl font-black text-indigo-600">
                            {Math.max(0, differenceInDays(parseISO(state.exam.date), new Date()))}
                          </div>
                          <input 
                            type="date" 
                            value={state.exam.date}
                            onChange={(e) => updateState({ exam: { ...state.exam!, date: e.target.value } })}
                            className="mt-2 text-xs bg-transparent border-none p-0 text-slate-400 focus:ring-0"
                          />
                        </div>
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="text-sm text-slate-500 mb-1 uppercase tracking-wider font-bold">Syllabus Progress</div>
                          <div className="flex items-end justify-between mb-2">
                            <div className="text-4xl font-black text-emerald-600">
                              {state.exam.syllabus.length > 0 
                                ? Math.round((state.exam.completedTopics.length / state.exam.syllabus.length) * 100) 
                                : 0}%
                            </div>
                            <div className="text-xs text-slate-400 font-medium">
                              {state.exam.completedTopics.length}/{state.exam.syllabus.length} Topics
                            </div>
                          </div>
                          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${state.exam.syllabus.length > 0 ? (state.exam.completedTopics.length / state.exam.syllabus.length) * 100 : 0}%` }}
                              className="h-full bg-emerald-500"
                            />
                          </div>
                        </div>
                      </div>

                      {state.exam.syllabus.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Topics Breakdown</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {state.exam.syllabus.map(topic => (
                              <button
                                key={topic}
                                onClick={() => toggleTopic(topic)}
                                className={cn(
                                  "flex items-center p-3 rounded-xl border transition-all text-left",
                                  state.exam?.completedTopics.includes(topic)
                                    ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                    : "bg-white border-slate-100 text-slate-600 hover:border-indigo-200"
                                )}
                              >
                                {state.exam?.completedTopics.includes(topic) ? <CheckCircle2 size={18} className="mr-3 shrink-0" /> : <Circle size={18} className="mr-3 shrink-0" />}
                                <span className="text-sm font-medium truncate">{topic}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Habits Section */}
              {(state.mode === 'habit' || state.mode === 'both') && (
                <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <Activity size={20} />
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">Daily Habits</h2>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="New habit..." 
                        className="text-sm px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 w-40 sm:w-64"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addHabit(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {state.habits.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <Activity size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No habits tracked yet. Start small!</p>
                      </div>
                    ) : (
                      state.habits.map(habit => {
                        const isDoneToday = habit.completedDays.includes(format(new Date(), 'yyyy-MM-dd'));
                        return (
                          <motion.div 
                            layout
                            key={habit.id}
                            className={cn(
                              "group flex items-center justify-between p-4 rounded-2xl border transition-all",
                              isDoneToday ? "bg-indigo-50 border-indigo-100" : "bg-white border-slate-100 hover:border-indigo-200"
                            )}
                          >
                            <div className="flex items-center space-x-4">
                              <button 
                                onClick={() => toggleHabit(habit.id)}
                                className={cn(
                                  "p-2 rounded-xl transition-colors",
                                  isDoneToday ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400 hover:text-indigo-600"
                                )}
                              >
                                {isDoneToday ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                              </button>
                              <div>
                                <div className={cn("font-bold", isDoneToday ? "text-indigo-900 line-through opacity-50" : "text-slate-900")}>
                                  {habit.name}
                                </div>
                                <div className="text-xs text-slate-500 font-medium">
                                  {habit.completedDays.length} days completed
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => deleteHabit(habit.id)}
                              className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={18} />
                            </button>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column: Stats & Quick Actions */}
            <div className="space-y-8">
              <section className="bg-indigo-600 rounded-3xl p-8 text-white shadow-lg shadow-indigo-200 overflow-hidden relative">
                <div className="relative z-10">
                  <h3 className="text-lg font-bold mb-4">Daily Focus</h3>
                  <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                    "The secret of your future is hidden in your daily routine."
                  </p>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="text-xs text-indigo-200 uppercase font-bold mb-1">Overall Progress</div>
                      <div className="w-full h-2 bg-indigo-500/50 rounded-full">
                        <div className="h-full bg-white rounded-full" style={{ width: '65%' }} />
                      </div>
                    </div>
                    <div className="text-2xl font-black">65%</div>
                  </div>
                </div>
                <Brain className="absolute -bottom-4 -right-4 text-indigo-500/20 w-32 h-32" />
              </section>

              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Insights</h3>
                <div className="space-y-4">
                  <div className="flex items-center p-3 bg-emerald-50 rounded-xl">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg mr-3">
                      <Activity size={18} />
                    </div>
                    <div>
                      <div className="text-xs text-emerald-600 font-bold uppercase">Best Streak</div>
                      <div className="text-sm font-bold text-slate-900">12 Days - Morning Yoga</div>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-amber-50 rounded-xl">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg mr-3">
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <div className="text-xs text-amber-600 font-bold uppercase">Study Time</div>
                      <div className="text-sm font-bold text-slate-900">4.5 Hours Today</div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'zen' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4 py-12">
              <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                <Wind size={40} className="animate-pulse" />
              </div>
              <h1 className="text-4xl font-black text-slate-900">Zen Zone</h1>
              <p className="text-slate-500 text-lg">Take a moment to breathe and reset your mind.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center space-x-3">
                  <Music className="text-indigo-600" />
                  <h2 className="text-xl font-bold">Soothing Sounds</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'Rainforest Ambience', duration: '15:00' },
                    { name: 'Deep Focus Lo-fi', duration: '60:00' },
                    { name: 'Tibetan Singing Bowls', duration: '20:00' },
                    { name: 'Ocean Waves', duration: '30:00' }
                  ].map(track => (
                    <button key={track.name} className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50 transition-colors group">
                      <div className="flex items-center">
                        <div className="p-2 bg-white rounded-lg mr-4 group-hover:text-indigo-600">
                          <Music size={18} />
                        </div>
                        <span className="font-semibold text-slate-700">{track.name}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-bold">{track.duration}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center space-x-3">
                  <Activity className="text-indigo-600" />
                  <h2 className="text-xl font-bold">Quick Exercises</h2>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-6 rounded-3xl bg-indigo-600 text-white space-y-4">
                    <h3 className="text-lg font-bold">Box Breathing</h3>
                    <p className="text-indigo-100 text-sm">Inhale 4s, Hold 4s, Exhale 4s, Hold 4s. Repeat 4 times.</p>
                    <button className="px-6 py-2 bg-white text-indigo-600 rounded-xl font-bold text-sm">Start Guide</button>
                  </div>
                  <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4">
                    <h3 className="text-lg font-bold">Desk Yoga</h3>
                    <p className="text-slate-400 text-sm">5 simple stretches you can do right at your chair.</p>
                    <button className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">View Poses</button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-8">
            <h2 className="text-2xl font-bold text-slate-900">App Settings</h2>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Theme Customization</h3>
                <div className="flex items-center space-x-6">
                  <div 
                    className="w-20 h-20 rounded-2xl shadow-inner border-4 border-white"
                    style={{ backgroundColor: state.themeColor }}
                  />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-slate-600">Pick a primary color or upload an image to extract a theme.</p>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="color" 
                        value={state.themeColor}
                        onChange={(e) => updateState({ themeColor: e.target.value })}
                        className="w-10 h-10 p-0 border-none bg-transparent cursor-pointer"
                      />
                      <label className="flex items-center space-x-2 px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-200 transition-colors">
                        <ImageIcon size={16} />
                        <span>Upload Image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                      {state.themeImage && (
                        <button 
                          onClick={() => updateState({ themeImage: null, themeColor: '#6366f1' })}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">App Mode</h3>
                <div className="flex p-1 bg-slate-100 rounded-xl">
                  {['habit', 'study', 'both'].map(m => (
                    <button
                      key={m}
                      onClick={() => handleModeToggle(m as AppMode)}
                      className={cn(
                        "flex-1 py-2 text-sm font-bold rounded-lg capitalize transition-all",
                        state.mode === m ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button 
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY);
                    window.location.reload();
                  }}
                  className="text-sm font-bold text-red-500 hover:text-red-600"
                >
                  Reset All Data
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Gemini Assistant (Lower Left) */}
      <div className="fixed bottom-6 left-6 z-50">
        <AnimatePresence>
          {chatOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-16 left-0 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[500px]"
            >
              <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Brain size={20} />
                  <span className="font-bold">Zenith AI Assistant</span>
                </div>
                <button onClick={() => setChatOpen(false)} className="p-1 hover:bg-indigo-500 rounded-lg">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
                {messages.map((m, i) => (
                  <div key={i} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] p-3 rounded-2xl text-sm",
                      m.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-slate-100 text-slate-800 rounded-tl-none"
                    )}>
                      <div className="prose prose-sm prose-indigo max-w-none">
                        <Markdown>
                          {m.text}
                        </Markdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-100 flex items-center space-x-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  onClick={sendMessage}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button 
          onClick={() => setChatOpen(!chatOpen)}
          className="w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center hover:scale-110 transition-transform"
        >
          <MessageSquare size={24} />
        </button>
      </div>

      {/* Daily Check-in Modal */}
      <AnimatePresence>
        {showCheckIn && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg w-full bg-white rounded-[40px] p-10 shadow-2xl text-center space-y-8"
            >
              {!checkInQuote ? (
                <>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-900">Good Morning!</h2>
                    <p className="text-slate-500">How are you feeling today?</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { emoji: '🌟', label: 'Inspired', mood: 'inspired' },
                      { emoji: '😌', label: 'Calm', mood: 'calm' },
                      { emoji: '🔋', label: 'Energized', mood: 'energized' },
                      { emoji: '😴', label: 'Tired', mood: 'tired' },
                      { emoji: '🧠', label: 'Focused', mood: 'focused' },
                      { emoji: '☁️', label: 'Anxious', mood: 'anxious' }
                    ].map(m => (
                      <button
                        key={m.mood}
                        onClick={() => handleCheckIn(m.mood)}
                        className="p-4 rounded-3xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 transition-all group"
                      >
                        <div className="text-3xl mb-2 group-hover:scale-125 transition-transform">{m.emoji}</div>
                        <div className="text-sm font-bold text-slate-700">{m.label}</div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-8">
                  <div className="p-8 bg-indigo-50 rounded-[32px] relative">
                    <Quote className="absolute top-4 left-4 text-indigo-200 w-12 h-12" />
                    <div className="relative z-10">
                      <div className="text-xl font-medium text-indigo-900 italic leading-relaxed">
                        <Markdown>
                          {checkInQuote.quote}
                        </Markdown>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowCheckIn(false)}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-colors"
                  >
                    Start My Day
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
