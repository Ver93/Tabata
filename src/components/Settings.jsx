import styles from "./Settings.module.css";

export default function Settings({
  workTime,
  restTime,
  rounds,
  countdownTime,
  setWorkTime,
  setRestTime,
  setRounds,
  setCountdownTime,
  disabled
}) {
  return (
    <section className={styles.settings}>
      <Setting
        label="Work"
        value={workTime}
        unit="sec"
        disabled={disabled}
        onMinus={() =>
          setWorkTime(Math.max(5, workTime - 5))
        }
        onPlus={() =>
          setWorkTime(Math.min(300, workTime + 5))
        }
      />

      <Setting
        label="Rest"
        value={restTime}
        unit="sec"
        disabled={disabled}
        onMinus={() =>
          setRestTime(Math.max(5, restTime - 5))
        }
        onPlus={() =>
          setRestTime(Math.min(300, restTime + 5))
        }
      />

      <Setting
        label="Rounds"
        value={rounds}
        disabled={disabled}
        onMinus={() =>
          setRounds(Math.max(1, rounds - 1))
        }
        onPlus={() =>
          setRounds(Math.min(50, rounds + 1))
        }
      />

      <Setting
        label="Countdown"
        value={countdownTime}
        unit="sec"
        disabled={disabled}
        onMinus={() =>
          setCountdownTime(
            Math.max(0, countdownTime - 1)
          )
        }
        onPlus={() =>
          setCountdownTime(
            Math.min(10, countdownTime + 1)
          )
        }
      />
    </section>
  );
}

function Setting({
  label,
  value,
  unit,
  disabled,
  onMinus,
  onPlus
}) {
  return (
    <div className={styles.setting}>
      <span>{label}</span>

      <div className={styles.control}>
        <button
          onClick={onMinus}
          disabled={disabled}
        >
          −
        </button>

        <strong>{value}</strong>

        <button
          onClick={onPlus}
          disabled={disabled}
        >
          +
        </button>
      </div>

      {unit && <small>{unit}</small>}
    </div>
  );
}