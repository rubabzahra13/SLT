import styles from "./LoginBgAtmosphere.module.css";

const CHARCOAL_SRC = "/login/bg-charcoal.png";
const SMOKE_SRC = "/login/bg-smoke-ref.jpg";

/**
 * Full-field cinematic smoke over charcoal — teal / amber throughout,
 * drifting slowly via layered screen-blend plates + soft orbs.
 */
export function LoginBgAtmosphere({ className }: { className?: string }) {
  return (
    <div
      className={[styles.atmosphere, className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <div
        className={styles.plate}
        style={{ backgroundImage: `url("${CHARCOAL_SRC}")` }}
      />

      <div className={styles.smokeField}>
        <div
          className={`${styles.smoke} ${styles.smokePrimary}`}
          style={{ backgroundImage: `url("${SMOKE_SRC}")` }}
        />
        <div
          className={`${styles.smoke} ${styles.smokeSecondary}`}
          style={{ backgroundImage: `url("${SMOKE_SRC}")` }}
        />
        <div
          className={`${styles.smoke} ${styles.smokeTertiary}`}
          style={{ backgroundImage: `url("${SMOKE_SRC}")` }}
        />
        <div
          className={`${styles.smoke} ${styles.smokeQuaternary}`}
          style={{ backgroundImage: `url("${SMOKE_SRC}")` }}
        />
      </div>

      <div className={`${styles.orb} ${styles.orbTealA}`} />
      <div className={`${styles.orb} ${styles.orbAmberA}`} />
      <div className={`${styles.orb} ${styles.orbTealB}`} />
      <div className={`${styles.orb} ${styles.orbAmberB}`} />

      <div className={styles.veil} />
    </div>
  );
}
