import { useState, useEffect, useRef, useCallback } from 'react';

const POMODORO_STATES = {
  WORK: 'work',
  SHORT_BREAK: 'short_break',
  LONG_BREAK: 'long_break',
};

const DURATIONS = {
  [POMODORO_STATES.WORK]: 25 * 60, // 25 minutes
  [POMODORO_STATES.SHORT_BREAK]: 5 * 60, // 5 minutes
  [POMODORO_STATES.LONG_BREAK]: 15 * 60, // 15 minutes
};

const STATE_LABELS = {
  [POMODORO_STATES.WORK]: 'Focus Time',
  [POMODORO_STATES.SHORT_BREAK]: 'Short Break',
  [POMODORO_STATES.LONG_BREAK]: 'Long Break',
};

const STATE_COLORS = {
  [POMODORO_STATES.WORK]: 'from-rose-900 to-red-950',
  [POMODORO_STATES.SHORT_BREAK]: 'from-emerald-900 to-green-950',
  [POMODORO_STATES.LONG_BREAK]: 'from-indigo-900 to-blue-950',
};

// FluxFM streams from https://www.fluxfm.de/flux-musik-streams
const MUSIC_CHANNELS = [
  { id: 'none', name: 'No Music', url: null },
  { id: 'chillhop', name: 'Chillhop', url: 'https://channels.fluxfm.de/chillhop/externalembedflxhp/stream.mp3' },
  { id: 'chillout', name: 'Chillout Radio', url: 'https://channels.fluxfm.de/chillout-radio/externalembedflxhp/stream.mp3' },
  { id: 'lounge', name: 'Flux Lounge', url: 'https://channels.fluxfm.de/flux-lounge/externalembedflxhp/stream.mp3' },
  { id: 'yoga', name: 'Yoga Sounds', url: 'https://channels.fluxfm.de/externalembedflxhp/yoga-sounds/stream.mp3' },
  { id: 'electronic', name: 'Electronic Chillout', url: 'https://channels.fluxfm.de/externalembedflxhp/electronic-chillout/stream.mp3' },
  { id: 'jazz', name: 'Xjazz', url: 'https://channels.fluxfm.de/x-jazz/externalembedflxhp/stream.mp3' },
  { id: 'finest', name: 'Flux Finest', url: 'https://channels.fluxfm.de/fluxfm-finest/externalembedflxhp/stream.mp3' },
  { id: 'elektro', name: 'ElektroFlux', url: 'https://channels.fluxfm.de/elektro-flux/externalembedflxhp/stream.mp3' },
  { id: 'berlin', name: 'Sound Of Berlin', url: 'https://channels.fluxfm.de/sound-of-berlin/externalembedflxhp/stream.mp3' },
];

export function PomodoroTimer({ onClose, taskTitle, task, onUpdateTask, focusQueue = [], onMarkTaskDone, onRemoveFromQueue }) {
  const [pomodoroState, setPomodoroState] = useState(POMODORO_STATES.WORK);
  const [timeRemaining, setTimeRemaining] = useState(DURATIONS[POMODORO_STATES.WORK]);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [selectedChannel, setSelectedChannel] = useState(MUSIC_CHANNELS[0]);
  const [volume, setVolume] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [taskMarkedInProgress, setTaskMarkedInProgress] = useState(false);

  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const originalTitleRef = useRef(document.title);

  // Format time helper
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Update browser tab title with timer
  useEffect(() => {
    if (isRunning) {
      const stateEmoji = pomodoroState === POMODORO_STATES.WORK ? '🍅' : '☕';
      document.title = `${stateEmoji} ${formatTime(timeRemaining)} - ${taskTitle || 'Focus'}`;
    } else {
      document.title = `⏸ ${formatTime(timeRemaining)} - Paused`;
    }

    // Restore original title on unmount
    return () => {
      document.title = originalTitleRef.current;
    };
  }, [timeRemaining, isRunning, pomodoroState, taskTitle, formatTime]);

  // Handle close with notes save
  const handleClose = useCallback(() => {
    // Save notes to task if there are any and we have a task
    if (notes.trim() && task && onUpdateTask) {
      const existingNotes = task.description || '';
      const timestamp = new Date().toLocaleString();
      const newNote = `\n\n--- Pomodoro Notes (${timestamp}) ---\n${notes}`;
      onUpdateTask(task.id, {
        description: existingNotes + newNote
      });
    }

    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Restore title
    document.title = originalTitleRef.current;

    onClose();
  }, [notes, task, onUpdateTask, onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in textarea
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning(prev => !prev);
      } else if (e.code === 'Escape') {
        handleClose();
      } else if (e.code === 'KeyR') {
        setIsRunning(false);
        setTimeRemaining(DURATIONS[pomodoroState]);
      } else if (e.code === 'KeyN') {
        setShowNotes(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, pomodoroState]);

  // Play/pause music
  const toggleMusic = useCallback(async () => {
    if (!selectedChannel.url) return;

    try {
      // If already playing, stop
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        setIsPlaying(false);
        setAudioError(null);
        return;
      }

      // Create new audio element each time to avoid caching issues
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      const audio = new Audio();
      audioRef.current = audio;

      // Set up event handlers before setting src
      audio.oncanplay = () => {
        console.log('Audio can play');
      };

      audio.onplaying = () => {
        console.log('Audio is playing');
        setIsPlaying(true);
        setAudioError(null);
      };

      audio.onerror = (e) => {
        console.error('Audio error:', e);
        setAudioError('Stream unavailable. Try another channel.');
        setIsPlaying(false);
      };

      audio.onended = () => {
        setIsPlaying(false);
      };

      // Set source and play
      audio.src = selectedChannel.url;
      audio.volume = volume;

      console.log('Attempting to play:', selectedChannel.url);
      await audio.play();

    } catch (err) {
      console.error('Playback error:', err);
      setAudioError(`Playback failed: ${err.message || 'Unknown error'}`);
      setIsPlaying(false);
    }
  }, [selectedChannel, isPlaying, volume]);

  // Handle channel change - just select, don't auto-play
  const selectChannel = useCallback((channel) => {
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    setSelectedChannel(channel);
    setIsPlaying(false);
    setAudioError(null);
  }, []);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      // Timer complete
      setIsRunning(false);

      // Play notification sound
      const notificationSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVAiQJnIuXZSHil4q8CAR0swcKS/e0dOVHaYrmRLX2V2l6NhTFtgcpigY1FYX3SWn2FXX15ykJpgYGJfbYiWYW5mXmh9kmSAb11ceYxniHlcVnWHaJJ/WU5xg2qchFVIcIJwpIZPQnB/dq6LR0R0g36wikNIdYaEto9BWHuKir2TN1l/kJLDlihgf5OYyJcbboGUncuXEnaAlZ/LlQt7f5OfypUI');
      notificationSound.play().catch(() => {});

      // Determine next state
      if (pomodoroState === POMODORO_STATES.WORK) {
        const newCompleted = completedPomodoros + 1;
        setCompletedPomodoros(newCompleted);

        if (newCompleted % 4 === 0) {
          setPomodoroState(POMODORO_STATES.LONG_BREAK);
          setTimeRemaining(DURATIONS[POMODORO_STATES.LONG_BREAK]);
        } else {
          setPomodoroState(POMODORO_STATES.SHORT_BREAK);
          setTimeRemaining(DURATIONS[POMODORO_STATES.SHORT_BREAK]);
        }
      } else {
        setPomodoroState(POMODORO_STATES.WORK);
        setTimeRemaining(DURATIONS[POMODORO_STATES.WORK]);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining, pomodoroState, completedPomodoros]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleTimer = () => {
    const newIsRunning = !isRunning;
    setIsRunning(newIsRunning);

    // Mark current task as in_progress when starting timer
    if (newIsRunning && task && !taskMarkedInProgress && onUpdateTask) {
      onUpdateTask(task.id, { status: 'in_progress' });
      setTaskMarkedInProgress(true);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeRemaining(DURATIONS[pomodoroState]);
  };

  // Mark a task as done and skip to break
  const handleMarkTaskDone = (taskToComplete) => {
    if (onMarkTaskDone) {
      onMarkTaskDone(taskToComplete.id);
    }
    if (onRemoveFromQueue) {
      onRemoveFromQueue(taskToComplete.id);
    }
    // Skip to break
    skipToNext();
  };

  const skipToNext = () => {
    setIsRunning(false);
    if (pomodoroState === POMODORO_STATES.WORK) {
      const newCompleted = completedPomodoros + 1;
      setCompletedPomodoros(newCompleted);
      if (newCompleted % 4 === 0) {
        setPomodoroState(POMODORO_STATES.LONG_BREAK);
        setTimeRemaining(DURATIONS[POMODORO_STATES.LONG_BREAK]);
      } else {
        setPomodoroState(POMODORO_STATES.SHORT_BREAK);
        setTimeRemaining(DURATIONS[POMODORO_STATES.SHORT_BREAK]);
      }
    } else {
      setPomodoroState(POMODORO_STATES.WORK);
      setTimeRemaining(DURATIONS[POMODORO_STATES.WORK]);
    }
  };

  const progress = ((DURATIONS[pomodoroState] - timeRemaining) / DURATIONS[pomodoroState]) * 100;

  return (
    <div className={`fixed inset-0 z-50 bg-gradient-to-br ${STATE_COLORS[pomodoroState]} transition-all duration-1000`}>
      {/* Subtle animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white z-20"
        title="Exit (Esc)"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Focus Queue - minimal list on the left */}
      {focusQueue.length > 0 && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 max-w-[220px]">
          <div className="text-white/40 text-xs uppercase tracking-wider mb-3">Queue</div>
          <div className="space-y-2">
            {focusQueue.map((queueTask, idx) => (
              <div
                key={queueTask.id}
                className={`flex items-center gap-2 text-sm py-1.5 px-2 rounded transition-all ${
                  task?.id === queueTask.id
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                <span className="text-white/30">{idx + 1}.</span>
                <span className="flex-1 truncate">{queueTask.title}</span>
                {queueTask.pomodoro_count > 0 && (
                  <span className="text-xs opacity-50">
                    {queueTask.pomodoro_count >= 4 ? '🍇' : '🍅'.repeat(queueTask.pomodoro_count)}
                  </span>
                )}
                <button
                  onClick={() => handleMarkTaskDone(queueTask)}
                  className="w-5 h-5 rounded-full bg-white/10 hover:bg-green-500/50 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  title="Mark done"
                >
                  ✓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top right buttons */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-20">
        {/* Notes button */}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={`p-3 rounded-full transition-colors ${
            showNotes ? 'bg-white/30 text-white' : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
          }`}
          title="Notes (N)"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {notes.trim() && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full" />
          )}
        </button>

        {/* Music button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-3 rounded-full transition-colors ${
            showSettings ? 'bg-white/30 text-white' : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
          }`}
          title="Music"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          {isPlaying && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Notes panel */}
      {showNotes && (
        <div
          className="absolute top-20 left-6 w-80 bg-black/60 backdrop-blur-xl rounded-xl p-6 space-y-4 animate-in slide-in-from-left z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium text-lg">Session Notes</h3>
            {task && (
              <span className="text-xs text-white/50">Saves to task</span>
            )}
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="Jot down thoughts, progress, blockers..."
            className="w-full h-40 bg-white/20 border border-white/30 rounded-lg p-4 text-white placeholder-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/25 cursor-text"
            style={{ pointerEvents: 'auto' }}
            autoFocus
          />

          <p className="text-white/40 text-xs">
            Notes will be added to the task when you exit.
          </p>
        </div>
      )}

      {/* Music panel */}
      {showSettings && (
        <div
          className="absolute top-20 right-6 w-72 bg-black/60 backdrop-blur-xl rounded-xl p-6 space-y-4 animate-in slide-in-from-right z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium text-lg">Music</h3>
            {selectedChannel.url && (
              <button
                onClick={toggleMusic}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isPlaying
                    ? 'bg-red-500/80 text-white hover:bg-red-500'
                    : 'bg-green-500 text-white hover:bg-green-400'
                }`}
              >
                {isPlaying ? '⏹ Stop' : '▶ Play'}
              </button>
            )}
          </div>

          {audioError && (
            <div className="text-yellow-300 text-sm bg-yellow-900/30 px-3 py-2 rounded-md">
              ⚠️ {audioError}
            </div>
          )}

          {isPlaying && (
            <div className="text-green-400 text-sm bg-green-900/30 px-3 py-2 rounded-md flex items-center gap-2">
              <span className="animate-pulse">♪</span> Now playing: {selectedChannel.name}
            </div>
          )}

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {MUSIC_CHANNELS.map(channel => (
              <button
                key={channel.id}
                onClick={() => selectChannel(channel)}
                className={`w-full text-left px-4 py-2.5 rounded-md transition-colors ${
                  selectedChannel.id === channel.id
                    ? 'bg-white/25 text-white font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center justify-between">
                  {channel.name}
                  {selectedChannel.id === channel.id && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Selected</span>
                  )}
                </span>
              </button>
            ))}
          </div>

          {selectedChannel.url && (
            <div className="pt-4 border-t border-white/10">
              <label className="text-white/60 text-sm block mb-2">Volume: {Math.round(volume * 100)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-white cursor-pointer"
              />
            </div>
          )}

          <p className="text-white/40 text-xs pt-2">
            Streams by <a href="https://www.fluxfm.de" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60">FluxFM</a>
          </p>
        </div>
      )}

      {/* Main content */}
      <div className="h-full flex flex-col items-center justify-center relative z-10">
        {/* Task title */}
        {taskTitle && taskTitle !== 'Focus Time' && (
          <p className="text-white/60 text-lg mb-4 font-light tracking-wide max-w-md text-center px-4">
            {taskTitle}
          </p>
        )}

        {/* State label */}
        <p className="text-white/80 text-2xl md:text-3xl font-light mb-8 tracking-widest uppercase">
          {STATE_LABELS[pomodoroState]}
        </p>

        {/* Timer display */}
        <div className="relative mb-12">
          {/* Progress ring */}
          <svg className="w-72 h-72 md:w-96 md:h-96 transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="2"
            />
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className="transition-all duration-1000"
            />
          </svg>

          {/* Time */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-7xl md:text-9xl font-extralight tracking-tight tabular-nums">
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button
            onClick={resetTimer}
            className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white"
            title="Reset (R)"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={toggleTimer}
            className="p-8 rounded-full bg-white/20 hover:bg-white/30 transition-all transform hover:scale-105 text-white shadow-elevation-3"
          >
            {isRunning ? (
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={skipToNext}
            className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white"
            title="Skip to next"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Pomodoro count */}
        <div className="mt-12 flex items-center gap-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i < (completedPomodoros % 4) ? 'bg-white' : 'bg-white/20'
              }`}
            />
          ))}
          <span className="ml-3 text-white/60 text-sm">
            {completedPomodoros} completed
          </span>
        </div>

        {/* Keyboard hints */}
        <div className="absolute bottom-8 flex items-center gap-4 text-white/30 text-sm">
          <span><kbd className="px-2 py-1 bg-white/10 rounded">Space</kbd> {isRunning ? 'pause' : 'start'}</span>
          <span><kbd className="px-2 py-1 bg-white/10 rounded">N</kbd> notes</span>
          <span><kbd className="px-2 py-1 bg-white/10 rounded">Esc</kbd> exit</span>
        </div>
      </div>
    </div>
  );
}
