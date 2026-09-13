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

  // --------------------------------------------------
  // AUDIO DEBUG
  // --------------------------------------------------

  useEffect(() => {
    const sounds = [
      {
        name: "BEEP",
        ref: beepRef
      },
      {
        name: "COUNTDOWN",
        ref: countdownSoundRef
      },
      {
        name: "START",
        ref: startSoundRef
      }
    ];

    console.log("🔊 Checking audio files...");

    sounds.forEach(({ name, ref }) => {
      const audio = ref.current;

      if (!audio) {
        console.error(`❌ ${name}: audio element not found`);
        return;
      }

      console.log(`🔊 ${name}:`);
      console.log("   URL:", audio.currentSrc);
      console.log("   readyState:", audio.readyState);
      console.log("   networkState:", audio.networkState);

      audio.addEventListener("loadeddata", () => {
        console.log(`✅ ${name} loaded`);
        console.log(`   Duration: ${audio.duration}s`);
      });

      audio.addEventListener("canplaythrough", () => {
        console.log(`✅ ${name} can play`);
      });

      audio.addEventListener("play", () => {
        console.log(`▶️ ${name} PLAY`);
      });

      audio.addEventListener("ended", () => {
        console.log(`⏹️ ${name} ENDED`);
      });

      audio.addEventListener("error", () => {
        console.error(`❌ ${name} ERROR`);
        console.error(audio.error);
        console.error("URL:", audio.currentSrc);
      });
    });

    return () => {
      sounds.forEach(({ ref }) => {
        const audio = ref.current;

        if (audio) {
          audio.pause();
        }
      });
    };
  }, []);

  // --------------------------------------------------
  // SAVE SETTINGS
  // --------------------------------------------------

  useEffect(() => {
    localStorage.setItem(
      "tabata-settings",
      JSON.stringify(settings)
    );
  }, [settings]);

  // --------------------------------------------------
  // UPDATE INITIAL WORK TIME
  // --------------------------------------------------

  useEffect(() => {
    if (!started && !finished) {
      setSeconds(workTime);
    }
  }, [workTime, started, finished]);

  // --------------------------------------------------
  // COUNTDOWN
  // --------------------------------------------------

  useEffect(() => {
    if (!running || countdown <= 0) return;

    console.log(`⏱️ Countdown: ${countdown}`);

    const audio = countdownSoundRef.current;

    if (audio) {
      audio.currentTime = 0;

      audio.play()
        .then(() => {
          console.log(
            `🔊 Countdown sound played: ${countdown}`
          );
        })
        .catch(error => {
          console.error(
            `❌ Countdown sound failed:`,
            error
          );
        });
    }

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

  // --------------------------------------------------
  // START SOUND
  // --------------------------------------------------

  useEffect(() => {
    if (
      running &&
      started &&
      countdown === 0 &&
      seconds === workTime &&
      isWorking
    ) {
      console.log("🚀 Starting WORK");

      const audio = startSoundRef.current;

      if (audio) {
        audio.currentTime = 0;

        audio.play()
          .then(() => {
            console.log("🔊 Start sound played");
          })
          .catch(error => {
            console.error(
              "❌ Start sound failed:",
              error
            );
          });
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

  // --------------------------------------------------
  // MAIN TIMER
  // --------------------------------------------------

  useEffect(() => {
    if (!running || countdown > 0) return;

    const interval = setInterval(() => {
      setSeconds(prev => {
        if (prev > 1) {
          return prev - 1;
        }

        console.log("🔔 Interval finished");

        const audio = beepRef.current;

        if (audio) {
          audio.currentTime = 0;

          audio.play()
            .then(() => {
              console.log("🔊 Beep played");
            })
            .catch(error => {
              console.error(
                "❌ Beep failed:",
                error
              );
            });
        }

        // WORK -> REST
        if (isWorking) {
          console.log("💤 WORK → REST");

          setIsWorking(false);
          return restTime;
        }

        // REST -> NEXT ROUND
        if (round < rounds) {
          console.log(
            `💪 REST → WORK, round ${round + 1}`
          );

          setRound(prev => prev + 1);
          setIsWorking(true);

          return workTime;
        }

        // FINISHED
        console.log("🏁 TABATA FINISHED");

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

  // --------------------------------------------------
  // SETTINGS
  // --------------------------------------------------

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // --------------------------------------------------
  // START
  // --------------------------------------------------

  const start = () => {
    console.log("▶️ START button");

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
    console.log("▶️ RESUME");

    setRunning(true);
  };

  // --------------------------------------------------
  // PAUSE
  // --------------------------------------------------

  const pause = () => {
    console.log("⏸️ PAUSE");

    setRunning(false);
  };

  // --------------------------------------------------
  // RESET
  // --------------------------------------------------

  const reset = () => {
    console.log("🔄 RESET");

    setRunning(false);
    setStarted(false);
    setFinished(false);

    setCountdown(0);
    setRound(1);
    setSeconds(workTime);
    setIsWorking(true);
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <main className={styles.container}>
      {/* Sounds */}

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