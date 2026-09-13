import { useEffect, useRef, useState } from "react";
import Timer from "./components/Timer";
import Settings from "./components/Settings";
import Controls from "./components/Controls";
import styles from "./Tabata.module.css";

const defaults = {
  workTime: 20,
  restTime: 10,
  rounds: 8,
  countdownTime: 3
};

export default function Tabata() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("tabata-settings");

    if (!saved) return defaults;

    try {
      return {
        ...defaults,
        ...JSON.parse(saved)
      };
    } catch {
      return defaults;
    }
  });

  const {
    workTime,
    restTime,
    rounds,
    countdownTime
  } = settings;

  const [seconds, setSeconds] = useState(workTime);
  const [round, setRound] = useState(1);
  const [isWorking, setIsWorking] = useState(true);

  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const [countdown, setCountdown] = useState(0);

  const beepRef = useRef(null);
  const countdownSoundRef = useRef(null);
  const startSoundRef = useRef(null);

  // Save settings
  useEffect(() => {
    localStorage.setItem(
      "tabata-settings",
      JSON.stringify(settings)
    );
  }, [settings]);

  // Update initial work time
  useEffect(() => {
    if (!started && !finished) {
      setSeconds(workTime);
    }
  }, [workTime, started, finished]);

  // Countdown
  useEffect(() => {
    if (!running || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 0;
        }

        const next = prev - 1;

        const audio = countdownSoundRef.current;

        if (audio) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, countdown]);

  // Start sound when countdown finishes
  useEffect(() => {
    if (
      running &&
      started &&
      countdown === 0 &&
      seconds === workTime &&
      isWorking
    ) {
      const audio = startSoundRef.current;

      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    }
  }, [
    countdown,
    running,
    started,
    seconds,
    workTime,
    isWorking
  ]);

  // Main timer
  useEffect(() => {
    if (!running || countdown > 0) return;

    const interval = setInterval(() => {
      setSeconds(prev => {
        if (prev > 1) {
          return prev - 1;
        }

        // Play transition beep
        const audio = beepRef.current;

        if (audio) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }

        // WORK -> REST
        if (isWorking) {
          setIsWorking(false);
          return restTime;
        }

        // REST -> NEXT ROUND
        if (round < rounds) {
          setRound(prev => prev + 1);
          setIsWorking(true);

          return workTime;
        }

        // FINISHED
        setRunning(false);
        setFinished(true);

        return 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    running,
    countdown,
    isWorking,
    round,
    rounds,
    workTime,
    restTime
  ]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const playSound = audioRef => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const start = () => {
    // Start again after finished
    if (finished) {
      setRound(1);
      setSeconds(workTime);
      setIsWorking(true);
      setFinished(false);
      setStarted(true);
      setRunning(true);

      if (countdownTime > 0) {
        setCountdown(countdownTime);
        playSound(countdownSoundRef);
      } else {
        setCountdown(0);
        playSound(startSoundRef);
      }

      return;
    }

    // First start
    if (!started) {
      setStarted(true);
      setRunning(true);

      if (countdownTime > 0) {
        setCountdown(countdownTime);
        playSound(countdownSoundRef);
      } else {
        setCountdown(0);
        playSound(startSoundRef);
      }

      return;
    }

    // Resume
    setRunning(true);
  };

  const pause = () => {
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    setStarted(false);
    setFinished(false);

    setCountdown(0);
    setRound(1);
    setSeconds(workTime);
    setIsWorking(true);
  };

  return (
    <main className={styles.container}>
      <audio
        ref={beepRef}
        src="/tabata/sounds/beep.mp3"
        preload="auto"
      />

      <audio
        ref={countdownSoundRef}
        src="/tabata/sounds/countdown.mp3"
        preload="auto"
      />

      <audio
        ref={startSoundRef}
        src="/tabata/sounds/start.mp3"
        preload="auto"
      />

      <header className={styles.header}>
        <h1>Tabata</h1>
        <span>Interval Timer</span>
      </header>

      <div className={styles.app}>
        <Timer
          seconds={seconds}
          round={round}
          rounds={rounds}
          workTime={workTime}
          restTime={restTime}
          isWorking={isWorking}
          finished={finished}
          countdown={countdown}
          running={running}
        />

        {!started && !finished && (
          <Settings
            workTime={workTime}
            restTime={restTime}
            rounds={rounds}
            countdownTime={countdownTime}
            setWorkTime={value =>
              updateSetting("workTime", value)
            }
            setRestTime={value =>
              updateSetting("restTime", value)
            }
            setRounds={value =>
              updateSetting("rounds", value)
            }
            setCountdownTime={value =>
              updateSetting("countdownTime", value)
            }
            disabled={false}
          />
        )}

        <Controls
          running={running}
          finished={finished}
          started={started}
          onStart={start}
          onPause={pause}
          onReset={reset}
        />
      </div>
    </main>
  );
}