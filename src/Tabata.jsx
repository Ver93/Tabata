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

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, countdown]);

  // Main timer
  useEffect(() => {
    if (!running || countdown > 0) return;

    const interval = setInterval(() => {
      setSeconds(prev => {
        if (prev > 1) {
          return prev - 1;
        }

        beepRef.current?.play().catch(() => {});

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

  const start = () => {
    // Start a completely new session
    if (finished) {
      setRound(1);
      setSeconds(workTime);
      setIsWorking(true);
      setFinished(false);
      setCountdown(countdownTime);
      setStarted(true);
      setRunning(true);

      return;
    }

    // First start
    if (!started) {
      setStarted(true);

      if (countdownTime > 0) {
        setCountdown(countdownTime);
      }

      setRunning(true);

      return;
    }

    // Resume
    setRunning(true);
  };

  const pause = () => {
    // NOTHING gets reset.
    // Everything stays exactly where it is.
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
        src="/beep.mp3"
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