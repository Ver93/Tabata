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

  const timerStartRef = useRef(null);
  const countdownStartRef = useRef(null);

  // Create audio objects once
  useEffect(() => {
    beepRef.current = new Audio("/tabata/sounds/beep.mp3");
    countdownSoundRef.current = new Audio(
      "/tabata/sounds/countdown.mp3"
    );
    startSoundRef.current = new Audio(
      "/tabata/sounds/start.mp3"
    );

    beepRef.current.preload = "auto";
    countdownSoundRef.current.preload = "auto";
    startSoundRef.current.preload = "auto";
  }, []);

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

  const playSound = audioRef => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;

    audio.play().catch(() => {});
  };

  /*
   * Countdown
   *
   * Uses Date.now() instead of assuming that every
   * setInterval tick is exactly one second.
   */
  useEffect(() => {
    if (!running || countdown <= 0) return;

    if (!countdownStartRef.current) {
      countdownStartRef.current =
        Date.now() - (countdownTime - countdown) * 1000;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - countdownStartRef.current;
      const remaining = Math.max(
        0,
        countdownTime - Math.floor(elapsed / 1000)
      );

      setCountdown(prev => {
        if (remaining < prev && remaining > 0) {
          playSound(countdownSoundRef);
        }

        return remaining;
      });

      if (remaining <= 0) {
        clearInterval(interval);
        countdownStartRef.current = null;
      }
    }, 50);

    return () => clearInterval(interval);
  }, [running, countdownTime]);

  /*
   * Start sound when countdown finishes.
   */
  useEffect(() => {
    if (
      running &&
      started &&
      countdown === 0 &&
      seconds === workTime &&
      isWorking &&
      !timerStartRef.current
    ) {
      playSound(startSoundRef);

      timerStartRef.current = Date.now();
    }
  }, [
    countdown,
    running,
    started,
    seconds,
    workTime,
    isWorking
  ]);

  /*
   * Main timer
   *
   * Date.now() is the actual clock.
   * setInterval only updates the UI frequently.
   */
  useEffect(() => {
    if (!running || countdown > 0) return;

    if (!timerStartRef.current) {
      timerStartRef.current =
        Date.now() - (getCurrentDuration() - seconds) * 1000;
    }

    const interval = setInterval(() => {
      const duration = getCurrentDuration();

      const elapsed =
        (Date.now() - timerStartRef.current) / 1000;

      const remaining = Math.max(
        0,
        duration - Math.floor(elapsed)
      );

      setSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);

        playSound(beepRef);

        // WORK -> REST
        if (isWorking) {
          setIsWorking(false);
          setSeconds(restTime);
          timerStartRef.current = Date.now();
          return;
        }

        // REST -> NEXT ROUND
        if (round < rounds) {
          setRound(prev => prev + 1);
          setIsWorking(true);
          setSeconds(workTime);
          timerStartRef.current = Date.now();
          return;
        }

        // FINISHED
        setRunning(false);
        setFinished(true);
        setSeconds(0);
        timerStartRef.current = null;
      }
    }, 50);

    return () => clearInterval(interval);
  }, [
    running,
    countdown,
    isWorking,
    round,
    rounds,
    workTime,
    restTime,
    seconds
  ]);

  const getCurrentDuration = () => {
    return isWorking ? workTime : restTime;
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
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

      timerStartRef.current = null;

      if (countdownTime > 0) {
        setCountdown(countdownTime);
        countdownStartRef.current = Date.now();
        playSound(countdownSoundRef);
      } else {
        setCountdown(0);
        playSound(startSoundRef);
        timerStartRef.current = Date.now();
      }

      return;
    }

    // First start
    if (!started) {
      setStarted(true);
      setRunning(true);

      timerStartRef.current = null;

      if (countdownTime > 0) {
        setCountdown(countdownTime);
        countdownStartRef.current = Date.now();
        playSound(countdownSoundRef);
      } else {
        setCountdown(0);
        playSound(startSoundRef);
        timerStartRef.current = Date.now();
      }

      return;
    }

    // Resume
    setRunning(true);

    timerStartRef.current =
      Date.now() -
      (getCurrentDuration() - seconds) * 1000;
  };

  const pause = () => {
    setRunning(false);

    /*
     * Clear timing references so resume starts
     * from the exact displayed second.
     */
    timerStartRef.current = null;
    countdownStartRef.current = null;
  };

  const reset = () => {
    setRunning(false);
    setStarted(false);
    setFinished(false);

    setCountdown(0);
    setRound(1);
    setSeconds(workTime);
    setIsWorking(true);

    timerStartRef.current = null;
    countdownStartRef.current = null;
  };

  return (
    <main className={styles.container}>
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