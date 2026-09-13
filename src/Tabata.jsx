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

const SOUND_PATHS = {
  beep: "/tabata/sounds/beep.mp3",
  countdown: "/tabata/sounds/countdown.mp3",
  start: "/tabata/sounds/start.mp3",
  ticking: "/tabata/sounds/ticking.mp3",
  finish: "/tabata/sounds/finish.mp3"
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
  // AUDIO
  // --------------------------------------------------

  const audioContextRef = useRef(null);

  const soundsRef = useRef({
    beep: null,
    countdown: null,
    start: null,
    ticking: null,
    finish: null
  });

  const tickingSourceRef = useRef(null);

  useEffect(() => {
    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContext) {
      return;
    }

    audioContextRef.current = new AudioContext();

    return () => {
      try {
        tickingSourceRef.current?.stop();
      } catch {
        // Ignore if already stopped.
      }

      tickingSourceRef.current = null;

      audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

  useEffect(() => {
    const loadSounds = async () => {
      const context = audioContextRef.current;

      if (!context) return;

      try {
        const entries = await Promise.all(
          Object.entries(SOUND_PATHS).map(
            async ([name, path]) => {
              const response = await fetch(path);

              if (!response.ok) {
                throw new Error(
                  `Failed to load ${path}`
                );
              }

              const arrayBuffer =
                await response.arrayBuffer();

              const audioBuffer =
                await context.decodeAudioData(
                  arrayBuffer
                );

              return [name, audioBuffer];
            }
          )
        );

        soundsRef.current =
          Object.fromEntries(entries);
      } catch (error) {
        console.error(
          "Failed to load timer sounds:",
          error
        );
      }
    };

    loadSounds();
  }, []);

  const unlockAudio = async () => {
    const context = audioContextRef.current;

    if (!context) return;

    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        // Ignore browser audio restrictions.
      }
    }
  };

  const playSound = name => {
    const context = audioContextRef.current;
    const buffer = soundsRef.current[name];

    if (!context || !buffer) return;

    try {
      const source =
        context.createBufferSource();

      source.buffer = buffer;
      source.connect(context.destination);

      source.start(0);
    } catch {
      // Ignore audio playback errors.
    }
  };

  /*
   * Start ticking.mp3.
   *
   * Ticking is ONLY used during WORK.
   */
  const startTicking = () => {
    const context = audioContextRef.current;
    const buffer = soundsRef.current.ticking;

    if (!context || !buffer) return;

    if (tickingSourceRef.current) {
      return;
    }

    try {
      const source =
        context.createBufferSource();

      source.buffer = buffer;
      source.loop = true;

      source.connect(context.destination);

      source.start(0);

      tickingSourceRef.current = source;
    } catch {
      // Ignore audio playback errors.
    }
  };

  const stopTicking = () => {
    const source = tickingSourceRef.current;

    if (!source) return;

    try {
      source.stop();
    } catch {
      // Ignore if already stopped.
    }

    try {
      source.disconnect();
    } catch {
      // Ignore disconnect errors.
    }

    tickingSourceRef.current = null;
  };

  // --------------------------------------------------
  // SETTINGS
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
  // TIMER ENGINE
  // --------------------------------------------------

  const animationFrameRef = useRef(null);

  const phaseEndRef = useRef(null);
  const countdownEndRef = useRef(null);

  const pausedRemainingRef = useRef(null);
  const pausedCountdownRef = useRef(null);

  const phaseRef = useRef("work");
  const roundRef = useRef(1);

  useEffect(() => {
    phaseRef.current = isWorking
      ? "work"
      : "rest";
  }, [isWorking]);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  useEffect(() => {
    if (!running) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(
          animationFrameRef.current
        );

        animationFrameRef.current = null;
      }

      return;
    }

    const update = () => {
      const now = performance.now();

      // ----------------------------------------------
      // INITIAL COUNTDOWN
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
            playSound("countdown");
          }

          return remainingSeconds;
        });

        if (remainingMs <= 0) {
          countdownEndRef.current = null;

          setCountdown(0);

          phaseRef.current = "work";
          roundRef.current = 1;

          setIsWorking(true);
          setRound(1);
          setSeconds(workTime);

          phaseEndRef.current =
            performance.now() +
            workTime * 1000;

          pausedRemainingRef.current = null;

          playSound("start");
          startTicking();
        }
      }

      // ----------------------------------------------
      // WORK / REST
      // ----------------------------------------------

      else if (phaseEndRef.current !== null) {
        let phaseEnd = phaseEndRef.current;
        let currentPhase = phaseRef.current;
        let currentRound = roundRef.current;

        let remainingMs =
          phaseEnd - now;

        // --------------------------------------------
        // REST COUNTDOWN
        //
        // Last countdownTime seconds of REST:
        // 3 -> 2 -> 1
        // --------------------------------------------

        if (
          currentPhase === "rest" &&
          countdownTime > 0 &&
          remainingMs > 0 &&
          remainingMs <= countdownTime * 1000
        ) {
          const restCountdown = Math.ceil(
            remainingMs / 1000
          );

          setCountdown(prev => {
            if (
              restCountdown !== prev &&
              restCountdown > 0
            ) {
              playSound("countdown");
            }

            return restCountdown;
          });
        } else if (currentPhase === "rest") {
          setCountdown(0);
        }

        // --------------------------------------------
        // PHASE TRANSITIONS
        // --------------------------------------------

        while (remainingMs <= 0) {
          // ------------------------------------------
          // WORK -> REST
          // ------------------------------------------

          if (currentPhase === "work") {
            stopTicking();

            playSound("beep");

            currentPhase = "rest";

            setIsWorking(false);
            setCountdown(0);

            phaseEnd += restTime * 1000;

            phaseEndRef.current = phaseEnd;
            phaseRef.current = currentPhase;

            remainingMs =
              phaseEnd - now;

            continue;
          }

          // ------------------------------------------
          // REST -> NEXT ROUND
          // ------------------------------------------

          if (currentRound < rounds) {
            playSound("beep");

            setCountdown(0);

            currentRound += 1;
            currentPhase = "work";

            setRound(currentRound);
            setIsWorking(true);

            phaseEnd += workTime * 1000;

            phaseEndRef.current = phaseEnd;
            phaseRef.current = currentPhase;
            roundRef.current = currentRound;

            setSeconds(workTime);

            startTicking();

            remainingMs =
              phaseEnd - now;

            continue;
          }

          // ------------------------------------------
          // FINISHED
          // ------------------------------------------

          stopTicking();

          phaseEndRef.current = null;
          pausedRemainingRef.current = null;

          setCountdown(0);
          setSeconds(0);
          setRunning(false);
          setFinished(true);

          playSound("finish");

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
    rounds,
    countdownTime
  ]);

  // --------------------------------------------------
  // START / RESUME
  // --------------------------------------------------

  const start = async () => {
    await unlockAudio();

    // ----------------------------------------------
    // START AGAIN AFTER FINISH
    // ----------------------------------------------

    if (finished) {
      stopTicking();

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

        setCountdown(countdownTime);

        playSound("countdown");
      } else {
        countdownEndRef.current = null;

        phaseEndRef.current =
          performance.now() +
          workTime * 1000;

        setCountdown(0);

        playSound("start");
        startTicking();
      }

      return;
    }

    // ----------------------------------------------
    // FIRST START
    // ----------------------------------------------

    if (!started) {
      stopTicking();

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

        setCountdown(countdownTime);

        playSound("countdown");
      } else {
        countdownEndRef.current = null;

        phaseEndRef.current =
          performance.now() +
          workTime * 1000;

        setCountdown(0);

        playSound("start");
        startTicking();
      }

      return;
    }

    // ----------------------------------------------
    // RESUME INITIAL COUNTDOWN
    // ----------------------------------------------

    if (pausedCountdownRef.current !== null) {
      const remaining =
        pausedCountdownRef.current;

      countdownEndRef.current =
        performance.now() + remaining;

      pausedCountdownRef.current = null;

      stopTicking();

      setRunning(true);

      return;
    }

    // ----------------------------------------------
    // RESUME WORK / REST
    // ----------------------------------------------

    if (pausedRemainingRef.current !== null) {
      const remaining =
        pausedRemainingRef.current;

      phaseEndRef.current =
        performance.now() + remaining;

      pausedRemainingRef.current = null;

      if (phaseRef.current === "work") {
        startTicking();
      } else {
        stopTicking();

        if (
          countdownTime > 0 &&
          remaining <= countdownTime * 1000
        ) {
          setCountdown(
            Math.ceil(
              remaining / 1000
            )
          );
        }
      }

      setRunning(true);

      return;
    }

    // ----------------------------------------------
    // FALLBACK
    // ----------------------------------------------

    phaseEndRef.current =
      performance.now() +
      seconds * 1000;

    if (phaseRef.current === "work") {
      startTicking();
    } else {
      stopTicking();
    }

    setRunning(true);
  };

  // --------------------------------------------------
  // PAUSE
  // --------------------------------------------------

  const pause = () => {
    if (!running) return;

    const now = performance.now();

    // ----------------------------------------------
    // PAUSE INITIAL COUNTDOWN
    // ----------------------------------------------

    if (countdownEndRef.current !== null) {
      pausedCountdownRef.current = Math.max(
        0,
        countdownEndRef.current - now
      );

      countdownEndRef.current = null;

      stopTicking();

      setRunning(false);

      return;
    }

    // ----------------------------------------------
    // PAUSE WORK / REST
    // ----------------------------------------------

    if (phaseEndRef.current !== null) {
      pausedRemainingRef.current = Math.max(
        0,
        phaseEndRef.current - now
      );

      phaseEndRef.current = null;

      stopTicking();

      setRunning(false);
    }
  };

  // --------------------------------------------------
  // RESET
  // --------------------------------------------------

  const reset = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(
        animationFrameRef.current
      );

      animationFrameRef.current = null;
    }

    stopTicking();

    phaseEndRef.current = null;
    countdownEndRef.current = null;

    pausedRemainingRef.current = null;
    pausedCountdownRef.current = null;

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

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1>Tabata</h1>
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