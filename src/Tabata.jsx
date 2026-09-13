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

  // --------------------------------------------------
  // Audio
  // --------------------------------------------------

  const beepRef = useRef(null);
  const countdownSoundRef = useRef(null);
  const startSoundRef = useRef(null);

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

    return () => {
      beepRef.current?.pause();
      countdownSoundRef.current?.pause();
      startSoundRef.current?.pause();
    };
  }, []);

  const playSound = audioRef => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;

    audio.play().catch(() => {});
  };

  // --------------------------------------------------
  // Settings
  // --------------------------------------------------

  useEffect(() => {
    localStorage.setItem(
      "tabata-settings",
      JSON.stringify(settings)
    );
  }, [settings]);

  useEffect(() => {
    if (!started && !finished) {
      setSeconds(workTime);
    }
  }, [workTime, started, finished]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // --------------------------------------------------
  // Timer engine
  // --------------------------------------------------

  const animationFrameRef = useRef(null);

  const phaseEndRef = useRef(null);
  const countdownEndRef = useRef(null);

  const pausedRemainingRef = useRef(null);
  const pausedCountdownRef = useRef(null);

  const phaseRef = useRef("work");
  const roundRef = useRef(1);

  const lastCountdownValueRef = useRef(null);

  // Keep refs synchronized with React state.
  useEffect(() => {
    phaseRef.current = isWorking ? "work" : "rest";
  }, [isWorking]);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  const getDuration = () => {
    return phaseRef.current === "work"
      ? workTime
      : restTime;
  };

  // --------------------------------------------------
  // Main timer loop
  // --------------------------------------------------

  useEffect(() => {
    if (!running) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      return;
    }

    const update = () => {
      const now = performance.now();

      // ----------------------------------------------
      // COUNTDOWN
      // ----------------------------------------------

      if (countdownEndRef.current !== null) {
        const remainingMs =
          countdownEndRef.current - now;

        const remainingSeconds = Math.max(
          0,
          Math.ceil(remainingMs / 1000)
        );

        setCountdown(prev => {
          if (
            remainingSeconds < prev &&
            remainingSeconds > 0
          ) {
            playSound(countdownSoundRef);
          }

          return remainingSeconds;
        });

        if (remainingMs <= 0) {
          countdownEndRef.current = null;
          lastCountdownValueRef.current = null;

          setCountdown(0);

          // Start actual WORK immediately.
          phaseRef.current = "work";
          roundRef.current = 1;

          setIsWorking(true);
          setRound(1);

          phaseEndRef.current =
            performance.now() + workTime * 1000;

          pausedRemainingRef.current = null;

          playSound(startSoundRef);
        }
      }

      // ----------------------------------------------
      // WORK / REST
      // ----------------------------------------------

      else if (phaseEndRef.current !== null) {
        let phaseEnd = phaseEndRef.current;
        let currentPhase = phaseRef.current;
        let currentRound = roundRef.current;

        let remainingMs = phaseEnd - now;

        // Handle phase transitions.
        while (remainingMs <= 0) {
          // ------------------------------------------
          // WORK -> REST
          // ------------------------------------------

          if (currentPhase === "work") {
            playSound(beepRef);

            currentPhase = "rest";

            setIsWorking(false);

            phaseEnd += restTime * 1000;

            remainingMs = phaseEnd - now;

            phaseEndRef.current = phaseEnd;
            phaseRef.current = currentPhase;

            continue;
          }

          // ------------------------------------------
          // REST -> NEXT ROUND
          // ------------------------------------------

          if (currentRound < rounds) {
            playSound(beepRef);

            currentRound += 1;
            currentPhase = "work";

            setRound(currentRound);
            setIsWorking(true);

            phaseEnd += workTime * 1000;

            remainingMs = phaseEnd - now;

            phaseEndRef.current = phaseEnd;
            phaseRef.current = currentPhase;
            roundRef.current = currentRound;

            continue;
          }

          // ------------------------------------------
          // FINISHED
          // ------------------------------------------

          playSound(beepRef);

          phaseEndRef.current = null;
          pausedRemainingRef.current = null;

          setSeconds(0);
          setRunning(false);
          setFinished(true);

          if (animationFrameRef.current) {
            cancelAnimationFrame(
              animationFrameRef.current
            );

            animationFrameRef.current = null;
          }

          return;
        }

        const remainingSeconds = Math.max(
          0,
          Math.ceil(remainingMs / 1000)
        );

        setSeconds(remainingSeconds);
      }

      animationFrameRef.current =
        requestAnimationFrame(update);
    };

    animationFrameRef.current =
      requestAnimationFrame(update);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(
          animationFrameRef.current
        );

        animationFrameRef.current = null;
      }
    };
  }, [
    running,
    workTime,
    restTime,
    rounds
  ]);

  // --------------------------------------------------
  // Start / Resume
  // --------------------------------------------------

  const start = () => {
    // ----------------------------------------------
    // START AGAIN AFTER FINISH
    // ----------------------------------------------

    if (finished) {
      phaseRef.current = "work";
      roundRef.current = 1;

      setRound(1);
      setSeconds(workTime);
      setIsWorking(true);

      setFinished(false);
      setStarted(true);
      setRunning(true);

      pausedRemainingRef.current = null;
      pausedCountdownRef.current = null;

      if (countdownTime > 0) {
        countdownEndRef.current =
          performance.now() +
          countdownTime * 1000;

        lastCountdownValueRef.current =
          countdownTime;

        setCountdown(countdownTime);

        playSound(countdownSoundRef);
      } else {
        countdownEndRef.current = null;

        phaseEndRef.current =
          performance.now() +
          workTime * 1000;

        setCountdown(0);

        playSound(startSoundRef);
      }

      return;
    }

    // ----------------------------------------------
    // FIRST START
    // ----------------------------------------------

    if (!started) {
      phaseRef.current = "work";
      roundRef.current = 1;

      setStarted(true);
      setRunning(true);

      setRound(1);
      setIsWorking(true);
      setSeconds(workTime);

      pausedRemainingRef.current = null;
      pausedCountdownRef.current = null;

      if (countdownTime > 0) {
        countdownEndRef.current =
          performance.now() +
          countdownTime * 1000;

        lastCountdownValueRef.current =
          countdownTime;

        setCountdown(countdownTime);

        playSound(countdownSoundRef);
      } else {
        countdownEndRef.current = null;

        phaseEndRef.current =
          performance.now() +
          workTime * 1000;

        setCountdown(0);

        playSound(startSoundRef);
      }

      return;
    }

    // ----------------------------------------------
    // RESUME FROM PAUSE
    // ----------------------------------------------

    if (pausedCountdownRef.current !== null) {
      const remaining =
        pausedCountdownRef.current;

      countdownEndRef.current =
        performance.now() + remaining;

      pausedCountdownRef.current = null;

      setRunning(true);

      return;
    }

    if (pausedRemainingRef.current !== null) {
      const remaining =
        pausedRemainingRef.current;

      phaseEndRef.current =
        performance.now() + remaining;

      pausedRemainingRef.current = null;

      setRunning(true);

      return;
    }

    // Fallback.
    phaseEndRef.current =
      performance.now() +
      seconds * 1000;

    setRunning(true);
  };

  // --------------------------------------------------
  // Pause
  // --------------------------------------------------

  const pause = () => {
    if (!running) return;

    const now = performance.now();

    // Pause countdown.
    if (countdownEndRef.current !== null) {
      pausedCountdownRef.current = Math.max(
        0,
        countdownEndRef.current - now
      );

      countdownEndRef.current = null;

      setRunning(false);

      return;
    }

    // Pause work/rest.
    if (phaseEndRef.current !== null) {
      pausedRemainingRef.current = Math.max(
        0,
        phaseEndRef.current - now
      );

      phaseEndRef.current = null;

      setRunning(false);
    }
  };

  // --------------------------------------------------
  // Reset
  // --------------------------------------------------

  const reset = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(
        animationFrameRef.current
      );

      animationFrameRef.current = null;
    }

    phaseEndRef.current = null;
    countdownEndRef.current = null;

    pausedRemainingRef.current = null;
    pausedCountdownRef.current = null;

    lastCountdownValueRef.current = null;

    phaseRef.current = "work";
    roundRef.current = 1;

    setRunning(false);
    setStarted(false);
    setFinished(false);

    setCountdown(0);
    setRound(1);
    setSeconds(workTime);
    setIsWorking(true);
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

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
          started={started}
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
              updateSetting(
                "countdownTime",
                value
              )
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