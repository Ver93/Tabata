import styles from "./Timer.module.css";

export default function Timer({
  seconds,
  round,
  rounds,
  workTime,
  restTime,
  isWorking,
  finished,
  countdown,
  running,
  started
}) {
  const total = isWorking ? workTime : restTime;

  const progress =
    total > 0
      ? Math.min(1, Math.max(0, (total - seconds) / total))
      : 0;

  const circumference = 2 * Math.PI * 130;
  const offset = circumference * (1 - progress);

  const isPaused =
    started &&
    !running &&
    !finished &&
    countdown === 0;

  return (
    <section
      className={`${styles.timer} ${
        finished
          ? styles.finished
          : isPaused
            ? styles.paused
            : isWorking
              ? styles.work
              : styles.rest
      }`}
    >
      <svg
        className={styles.progress}
        viewBox="0 0 280 280"
      >
        <circle
          className={styles.track}
          cx="140"
          cy="140"
          r="130"
        />

        <circle
          className={styles.bar}
          cx="140"
          cy="140"
          r="130"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      <div className={styles.content}>
        {countdown > 0 ? (
          <>
            <span className={styles.status}>
              GET READY
            </span>

            <strong
              key={countdown}
              className={styles.countdown}
            >
              {countdown}
            </strong>
          </>
        ) : finished ? (
          <>
            <span className={styles.check}>
              ✓
            </span>

            <span className={styles.status}>
              FINISHED
            </span>

            <strong>
              Great job!
            </strong>
          </>
        ) : isPaused ? (
          <>
            <span className={styles.status}>
              PAUSED
            </span>

            <strong className={styles.time}>
              {String(seconds).padStart(2, "0")}
            </strong>

            <span className={styles.round}>
              {round} <small>/</small> {rounds}
            </span>
          </>
        ) : (
          <>
            <span className={styles.status}>
              {isWorking ? "WORK" : "REST"}
            </span>

            <strong className={styles.time}>
              {String(seconds).padStart(2, "0")}
            </strong>

            <span className={styles.round}>
              {round} <small>/</small> {rounds}
            </span>
          </>
        )}
      </div>
    </section>
  );
}