import styles from "./LoginCollagePanel.module.css";

const COLLAGE_SRC = "/login/collage-hero.png";

/** Scrapbook collage — black plate blends into charcoal via screen mix */
export function LoginCollagePanel() {
  return (
    <aside className={styles.panel} aria-hidden="true">
      <img
        src={COLLAGE_SRC}
        alt=""
        draggable={false}
        className={styles.hero}
      />
    </aside>
  );
}
