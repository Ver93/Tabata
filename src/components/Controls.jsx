import styles from "./Controls.module.css";

export default function Controls({
  running,
  finished,
  started,
  onStart,
  onPause,
  onReset
}) {
  return (
    <div className={styles.controls}>
      <button
        className={styles.main}
        onClick={running ? onPause : onStart}
      >
        {running
          ? "Pause"
          : finished
            ? "Start again"
            : started
              ? "Resume"
              : "Start"}
      </button>

      <button
        className={styles.reset}
        onClick={onReset}
        aria-label="Reset timer"
      >
        ↻
      </button>
    </div>
  );
}