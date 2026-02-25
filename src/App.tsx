/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Gamepad2, Timer, Trophy, User, ChevronRight, Award, 
  BarChart3, RotateCcw, Home, Lock, Trash2, Zap, 
  Shield, Swords, Target, Sparkles, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateQuestions, Question } from './services/geminiService';

type Step = 'splash' | 'pin' | 'welcome' | 'name' | 'grade' | 'category' | 'rules' | 'loading' | 'game' | 'result' | 'save-form' | 'dashboard';

interface ScoreEntry {
  id: number;
  name: string;
  grade: string;
  category: string;
  score: number;
  total_questions: number;
  percentage: number;
  grade_letter: string;
  created_at: string;
}

const CORRECT_PIN = "3630304";
const MAIN_LOGO = "https://api.dicebear.com/7.x/bottts/svg?seed=ClassClash"; 
const SUB_LOGO = "https://i.postimg.cc/GpcsCh7s/image.png"; 

// Sound Effects URLs
const SFX = {
  CLICK: "https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73561.mp3",
  CORRECT: "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3",
  WRONG: "https://cdn.pixabay.com/audio/2022/03/10/audio_c3523e41c7.mp3",
  START: "https://cdn.pixabay.com/audio/2024/02/07/audio_651a13e21c.mp3",
  WIN: "https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3",
  PIN_FAIL: "https://cdn.pixabay.com/audio/2022/03/24/audio_77f904d52d.mp3"
};

const playSound = (url: string) => {
  const audio = new Audio(url);
  audio.volume = 0.5;
  audio.play().catch(e => console.log("Audio play blocked", e));
};

export default function App() {
  const [step, setStep] = useState<Step>('splash');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [category, setCategory] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [dashboardFilter, setDashboardFilter] = useState<string>('All');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const grades = ['4', '5', '6', '7', '8', '9', '10'];
  const categories = ['Set 1 🎮', 'Set 2 🚀', 'Advanced Level 🔥'];

  useEffect(() => {
    if (step === 'splash') {
      const timer = setTimeout(() => setStep('pin'), 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  useEffect(() => {
    if (step === 'game' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleGameEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, timeLeft]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const handleDeleteScore = async (id: number) => {
    playSound(SFX.CLICK);
    // Optimistic update: remove from local state immediately
    setLeaderboard(prev => prev.filter(entry => entry.id !== id));
    
    try {
      const response = await fetch(`/api/scores/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete');
      }
      // Refresh from server to be sure
      fetchLeaderboard();
    } catch (error) {
      console.error('Error deleting score:', error);
      // Revert on error
      fetchLeaderboard();
      alert('Failed to delete record. Please try again.');
    }
  };

  const handleStartGame = async () => {
    playSound(SFX.START);
    setIsLoading(true);
    setStep('loading');
    try {
      const generatedQuestions = await generateQuestions(grade, category);
      setQuestions(generatedQuestions);
      setScore(0);
      setCurrentQuestionIndex(0);
      setTimeLeft(60);
      setIsLoading(false);
      
      // Simulate "line complete loader"
      setTimeout(() => {
        setStep('game');
      }, 2000);
    } catch (error) {
      console.error(error);
      setStep('rules');
    }
  };

  const handleAnswer = (selectedOption: string) => {
    if (selectedOption === questions[currentQuestionIndex].correctAnswer) {
      playSound(SFX.CORRECT);
      setScore((prev) => prev + 1);
    } else {
      playSound(SFX.WRONG);
    }

    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleGameEnd();
    }
  };

  const calculateGrade = (percentage: number) => {
    if (percentage >= 90) return 'A+ 🏆';
    if (percentage >= 80) return 'A 🌟';
    if (percentage >= 70) return 'B ✨';
    if (percentage >= 60) return 'C 👍';
    if (percentage >= 50) return 'D 😅';
    return 'F 💀';
  };

  const handleGameEnd = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    playSound(SFX.WIN);
    setStep('result');
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === CORRECT_PIN) {
      playSound(SFX.CLICK);
      setStep('welcome');
    } else {
      playSound(SFX.PIN_FAIL);
      setPinError(true);
      setPin('');
      setTimeout(() => setPinError(false), 1000);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'splash':
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center text-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="mb-8"
            >
              <Swords size={120} className="text-primary drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
            </motion.div>
            <h1 className="text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent tracking-tighter mb-4">
              CLASS CLASH
            </h1>
            <div className="flex items-center gap-2 text-secondary font-mono tracking-widest uppercase">
              <Sparkles size={16} />
              <span>Initializing Battle Arena</span>
              <Sparkles size={16} />
            </div>
          </motion.div>
        );

      case 'pin':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="gaming-card p-10 max-w-md w-full text-center"
          >
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/30">
              <Lock size={40} className="text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-8">Enter the secret PIN to enter the arena.</p>
            <form onSubmit={handlePinSubmit} className="space-y-6">
              <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="•••••••"
                className={`w-full text-center text-4xl tracking-[1em] gaming-input ${pinError ? 'border-red-500 animate-shake' : ''}`}
                autoFocus
              />
              <button className="w-full gaming-button bg-primary text-white py-4 rounded-2xl font-bold text-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]">
                UNSEAL ARENA
              </button>
            </form>
          </motion.div>
        );

      case 'welcome':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="gaming-card p-10 max-w-lg w-full text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
            <div className="flex flex-col items-center gap-4 mb-8">
              <img 
                src={MAIN_LOGO} 
                alt="ClassClash Logo" 
                className="w-24 h-24 object-contain drop-shadow-lg"
              />
              <img 
                src={SUB_LOGO} 
                alt="School Logo" 
                className="h-12 object-contain opacity-80"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://raw.githubusercontent.com/RayyanAliSayed/ClassClash/main/logo.png";
                }}
              />
            </div>
            <h1 className="text-6xl font-bold text-white mb-4 tracking-tighter">ClassClash ⚔️</h1>
            <p className="text-muted-foreground mb-10 text-lg">
              The ultimate gaming quiz challenge. Select your grade, pick a category, and dominate the leaderboard! 🚀
            </p>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => {
                  playSound(SFX.CLICK);
                  setStep('name');
                }}
                className="gaming-button bg-primary text-white py-5 rounded-2xl font-bold text-2xl flex items-center justify-center gap-3 group shadow-lg"
              >
                ENTER BATTLE <ChevronRight className="group-hover:translate-x-2 transition-transform" />
              </button>
              <button 
                onClick={() => {
                  playSound(SFX.CLICK);
                  fetchLeaderboard();
                  setStep('dashboard');
                }}
                className="gaming-button bg-white/5 text-white py-4 rounded-2xl font-bold text-lg border border-white/10 hover:bg-white/10"
              >
                HALL OF FAME 🏆
              </button>
            </div>
          </motion.div>
        );

      case 'name':
        return (
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="gaming-card p-10 max-w-md w-full text-center"
          >
            <div className="w-20 h-20 bg-secondary/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-secondary/30 rotate-3">
              <User size={40} className="text-secondary" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Identify Yourself 👤</h2>
            <p className="text-muted-foreground mb-8">What shall we call you, Warrior?</p>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter Warrior Name"
              className="w-full gaming-input text-xl mb-8 text-center"
              autoFocus
            />
            <button 
              disabled={!name.trim()}
              onClick={() => {
                playSound(SFX.CLICK);
                setStep('grade');
              }}
              className="w-full gaming-button bg-secondary text-black py-4 rounded-2xl font-bold text-xl"
            >
              CONFIRM IDENTITY
            </button>
          </motion.div>
        );

      case 'grade':
        return (
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="gaming-card p-10 max-w-2xl w-full text-center"
          >
            <h2 className="text-4xl font-bold mb-2">Select Your Rank 🎖️</h2>
            <p className="text-muted-foreground mb-10">Choose your current grade level.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {grades.map((g) => (
                <button 
                  key={g}
                  onClick={() => {
                    playSound(SFX.CLICK);
                    setGrade(g);
                    setStep('category');
                  }}
                  className={`p-8 rounded-3xl border-2 font-bold text-3xl transition-all gaming-button ${
                    grade === g 
                    ? 'bg-primary border-primary text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]' 
                    : 'border-white/10 bg-white/5 hover:border-primary/50 text-white/70'
                  }`}
                >
                  {g}
                  <span className="block text-xs uppercase opacity-50 mt-1">Grade</span>
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 'category':
        return (
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="gaming-card p-10 max-w-md w-full text-center"
          >
            <h2 className="text-3xl font-bold mb-2">Choose Mission 🎯</h2>
            <p className="text-muted-foreground mb-8">Select difficulty for Grade {grade}.</p>
            <div className="flex flex-col gap-4">
              {categories.map((cat) => {
                const isAdvanced = cat.includes('Advanced');
                const isDisabled = isAdvanced && !['8', '9', '10'].includes(grade);
                
                return (
                  <button 
                    key={cat}
                    disabled={isDisabled}
                    onClick={() => {
                      playSound(SFX.CLICK);
                      setCategory(cat);
                      setStep('rules');
                    }}
                    className={`p-6 rounded-2xl border-2 font-bold text-xl transition-all flex items-center justify-between gaming-button ${
                      isDisabled 
                      ? 'opacity-20 cursor-not-allowed grayscale border-white/5' 
                      : 'border-white/10 bg-white/5 hover:border-accent hover:bg-accent/10 text-white'
                    }`}
                  >
                    {cat}
                    {!isDisabled && <Zap size={20} className="text-accent" />}
                  </button>
                );
              })}
            </div>
            <button 
              onClick={() => {
                playSound(SFX.CLICK);
                setStep('grade');
              }}
              className="mt-8 text-muted-foreground hover:text-primary transition-colors text-sm font-bold uppercase tracking-widest"
            >
              ← Change Rank
            </button>
          </motion.div>
        );

      case 'rules':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="gaming-card p-10 max-w-md w-full text-center"
          >
            <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-accent/30">
              <Shield size={40} className="text-accent" />
            </div>
            <h2 className="text-3xl font-bold mb-8 uppercase tracking-tighter">Battle Briefing 📜</h2>
            <ul className="text-left space-y-5 mb-10 text-white/80 font-medium">
              <li className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                <Target size={20} className="text-primary" />
                <span>12 Questions to Conquer</span>
              </li>
              <li className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                <Timer size={20} className="text-secondary" />
                <span>60 Seconds Total Time</span>
              </li>
              <li className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                <Zap size={20} className="text-accent" />
                <span>Speed = Higher Glory</span>
              </li>
            </ul>
            <button 
              onClick={handleStartGame}
              className="w-full gaming-button bg-accent text-black py-5 rounded-2xl font-bold text-2xl shadow-[0_0_25px_rgba(34,211,238,0.4)]"
            >
              COMMENCE CLASH ⚔️
            </button>
          </motion.div>
        );

      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center text-center max-w-md w-full">
            <h2 className="text-4xl font-bold mb-10 animate-pulse text-primary uppercase tracking-widest">Generating Arena...</h2>
            <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden border border-white/10 p-1">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-primary via-secondary to-accent rounded-full"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <Loader2 className="animate-spin text-secondary" />
              <span className="text-muted-foreground font-mono">Loading assets...</span>
            </div>
          </div>
        );

      case 'game':
        if (questions.length === 0) return null;
        const currentQuestion = questions[currentQuestionIndex];
        
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto w-full"
          >
            <div className="flex justify-between items-center mb-8 gaming-card p-6 border-primary/20">
              <div className="flex items-center gap-3 text-primary font-bold text-xl">
                <Trophy size={24} />
                <span>EXP: {score * 100}</span>
              </div>
              <div className="flex items-center gap-3 text-secondary font-bold text-2xl font-mono">
                <Timer size={28} className={timeLeft < 10 ? 'text-red-500 animate-pulse' : ''} />
                <span className={timeLeft < 10 ? 'text-red-500' : ''}>{timeLeft}s</span>
              </div>
              <div className="text-white/60 font-bold uppercase tracking-widest text-sm">
                Wave {currentQuestionIndex + 1} / {questions.length}
              </div>
            </div>

            <div className="gaming-card p-10 mb-8 relative">
              <div className="absolute -top-3 left-10 bg-primary px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Question</div>
              <h3 className="text-3xl font-bold mb-10 leading-tight text-white">{currentQuestion.question}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleAnswer(option)}
                    className="p-6 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-primary hover:bg-primary/10 text-left font-bold text-xl transition-all gaming-button group flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <motion.div 
                className="bg-gradient-to-r from-primary to-secondary h-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </motion.div>
        );

      case 'result':
        const percentage = (score / questions.length) * 100;
        const gradeLetter = calculateGrade(percentage);
        
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="gaming-card p-10 max-w-md w-full text-center"
          >
            <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/30">
              <Award size={64} className="text-primary" />
            </div>
            <h2 className="text-5xl font-bold mb-2">Victory! 🏆</h2>
            <p className="text-muted-foreground mb-10 text-xl font-medium">Warrior {name}, you survived!</p>
            
            <div className="grid grid-cols-2 gap-4 w-full mb-10">
              <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                <div className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-2">Score</div>
                <div className="text-4xl font-black text-primary">{score}/{questions.length}</div>
              </div>
              <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                <div className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-2">Rank</div>
                <div className="text-4xl font-black text-secondary">{gradeLetter.split(' ')[0]}</div>
              </div>
            </div>

            <div className="flex flex-col gap-4 w-full">
              <button 
                onClick={() => {
                  playSound(SFX.CLICK);
                  setStep('save-form');
                }}
                className="w-full gaming-button bg-primary text-white py-5 rounded-2xl font-bold text-xl shadow-lg"
              >
                SAVE TO HALL OF FAME 🏛️
              </button>
              <button 
                onClick={() => {
                  playSound(SFX.CLICK);
                  fetchLeaderboard();
                  setStep('dashboard');
                }}
                className="w-full gaming-button bg-white/5 text-white py-4 rounded-2xl font-bold text-lg border border-white/10"
              >
                VIEW LEADERBOARD 📊
              </button>
              <button 
                onClick={() => {
                  playSound(SFX.CLICK);
                  setStep('grade');
                }}
                className="mt-4 text-muted-foreground hover:text-secondary font-bold uppercase tracking-widest text-sm"
              >
                ← Battle Again
              </button>
            </div>
          </motion.div>
        );

      case 'save-form':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="gaming-card p-10 max-w-md w-full text-center"
          >
            <h2 className="text-3xl font-bold mb-2">Finalize Record 📝</h2>
            <p className="text-muted-foreground mb-8">Confirm your stats for the Hall of Fame.</p>
            
            <div className="w-full space-y-6 mb-10 text-left">
              <div>
                <label className="block text-xs font-black text-muted-foreground uppercase mb-2 ml-1 tracking-widest">Warrior Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full gaming-input text-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-muted-foreground uppercase mb-2 ml-1 tracking-widest">Rank</label>
                  <select 
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full gaming-input bg-muted"
                  >
                    {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-muted-foreground uppercase mb-2 ml-1 tracking-widest">Mission</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full gaming-input bg-muted"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button 
              onClick={async () => {
                playSound(SFX.CLICK);
                const percentage = (score / (questions.length || 12)) * 100;
                const gradeLetter = calculateGrade(percentage);
                const scoreData = {
                  name,
                  grade,
                  category,
                  score,
                  total_questions: questions.length || 12,
                  percentage,
                  grade_letter: gradeLetter,
                };

                try {
                  await fetch('/api/scores', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(scoreData),
                  });
                  await fetchLeaderboard();
                  setStep('dashboard');
                } catch (error) {
                  console.error('Error saving score:', error);
                }
              }}
              className="w-full gaming-button bg-primary text-white py-5 rounded-2xl font-bold text-xl"
            >
              ETCH IN HISTORY 🏛️
            </button>
            <button 
              onClick={() => {
                playSound(SFX.CLICK);
                setStep('result');
              }}
              className="mt-6 text-muted-foreground hover:text-red-500 font-bold uppercase tracking-widest text-xs"
            >
              Discard Record
            </button>
          </motion.div>
        );

      case 'dashboard':
        const filteredLeaderboard = dashboardFilter === 'All' 
          ? leaderboard 
          : leaderboard.filter(e => e.grade === dashboardFilter);

        return (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto w-full gaming-card overflow-hidden"
          >
            <div className="p-10 border-b border-white/5 flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-primary/20 to-secondary/20 gap-6">
              <div className="flex items-center gap-6">
                <img src={SUB_LOGO} alt="Sub Logo" className="h-16 object-contain hidden md:block" />
                <div>
                  <h2 className="text-5xl font-black tracking-tighter text-white mb-2">HALL OF FAME 🏛️</h2>
                  <p className="text-muted-foreground font-medium">The elite warriors of ClassClash</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <select 
                  value={dashboardFilter}
                  onChange={(e) => {
                    playSound(SFX.CLICK);
                    setDashboardFilter(e.target.value);
                  }}
                  className="gaming-input bg-muted font-bold"
                >
                  <option value="All">All Grades</option>
                  {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
                <button 
                  onClick={() => {
                    playSound(SFX.CLICK);
                    setStep('welcome');
                  }}
                  className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/10"
                >
                  <Home size={28} />
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-8 py-5 font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Rank</th>
                    <th className="px-8 py-5 font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Warrior</th>
                    <th className="px-8 py-5 font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Grade</th>
                    <th className="px-8 py-5 font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Mission</th>
                    <th className="px-8 py-5 font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">EXP</th>
                    <th className="px-8 py-5 font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Grade</th>
                    <th className="px-8 py-5 font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLeaderboard.length > 0 ? (
                    filteredLeaderboard.map((entry, idx) => (
                      <tr key={entry.id} className={`hover:bg-white/5 transition-colors ${entry.name === name ? 'bg-primary/10' : ''}`}>
                        <td className="px-8 py-6 font-black text-2xl text-primary">#{idx + 1}</td>
                        <td className="px-8 py-6">
                          <div className="font-bold text-xl text-white">{entry.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{new Date(entry.created_at).toLocaleDateString()}</div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="bg-secondary/20 text-secondary px-3 py-1 rounded-lg font-bold text-sm">Grade {entry.grade}</span>
                        </td>
                        <td className="px-8 py-6 text-sm font-medium text-white/70">{entry.category}</td>
                        <td className="px-8 py-6 font-black text-xl text-accent">{entry.score * 100}</td>
                        <td className="px-8 py-6">
                          <span className="text-xl font-black">{entry.grade_letter}</span>
                        </td>
                        <td className="px-8 py-6">
                          <button 
                            onClick={() => handleDeleteScore(entry.id)}
                            className="p-3 text-muted-foreground hover:text-red-500 transition-colors bg-white/5 hover:bg-red-500/10 rounded-xl"
                          >
                            <Trash2 size={20} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-8 py-20 text-center text-muted-foreground italic text-xl">
                        No warriors have entered the Hall of Fame for this rank.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-10 bg-white/5 flex justify-center">
              <button 
                onClick={() => {
                  playSound(SFX.CLICK);
                  setStep('grade');
                }}
                className="gaming-button bg-primary text-white px-12 py-4 rounded-2xl font-black text-xl shadow-lg"
              >
                START NEW BATTLE ⚔️
              </button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full pointer-events-none" />
      
      <main className="flex-grow flex items-center justify-center w-full max-w-7xl">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </main>

      <footer className="w-full max-w-7xl py-8 mt-10 border-t border-white/5 text-center space-y-2">
        <p className="text-muted-foreground font-bold tracking-widest text-sm uppercase">
          Developed, Designed and Coded by <span className="text-primary">Rayyan Ali Sayed IX/C</span>
        </p>
        <p className="text-white/20 text-xs font-mono">
          © 2026 CLASS CLASH • ALL RIGHTS RESERVED • VERSION 2.0.0-GAMING
        </p>
      </footer>
    </div>
  );
}
