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
      ? Math.min(
          1,
          Math.max(0, (total - seconds) / total)
        )
      : 0;

  const circumference = 2 * Math.PI * 130;
  const offset = circumference * (1 - progress);

  const isPaused =
    started &&
    !running &&
    !finished &&
    countdown === 0;

  const status = finished
    ? "FINISHED"
    : isPaused
      ? "PAUSED"
      : isWorking
        ? "WORK"
        : "REST";

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
      <div className={styles.timerContent}>

        {/* STATUS CONTAINER */}
        <div className={styles.statusContainer}>
          {countdown > 0 ? (
            <span className={styles.status}>
              GET READY
            </span>
          ) : (
            <span className={styles.status}>
              {status}
            </span>
          )}
        </div>

        {/* CIRCLE CONTAINER */}
        <div className={styles.circleContainer}>
          <div className={styles.circle}>
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

            {countdown > 0 ? (
              <strong
                key={countdown}
                className={styles.countdown}
              >
                {countdown}
              </strong>
            ) : finished ? (
              <span className={styles.check}>
                ✓
              </span>
            ) : (
              <strong className={styles.time}>
                {String(seconds).padStart(2, "0")}
              </strong>
            )}
          </div>
        </div>

        {/* BOTTOM CONTAINER */}
        <div className={styles.bottomContainer}>
          {countdown > 0 ? null : finished ? (
            <strong className={styles.finishedText}>
              Great job!
            </strong>
          ) : (
            <span className={styles.round}>
              {round}
              <small>/</small>
              {rounds}
            </span>
          )}
        </div>

      </div>
    </section>
  );
}