const PREFIX = "mm_";

export function getMaxLevel(): number {
  return parseInt(localStorage.getItem(`${PREFIX}max_level`) ?? "1", 10);
}

export function setMaxLevel(level: number): void {
  const current = getMaxLevel();
  if (level > current) {
    localStorage.setItem(`${PREFIX}max_level`, String(level));
  }
}

export function getLevelScore(level: number): number {
  return parseInt(
    localStorage.getItem(`${PREFIX}score_L${level}`) ?? "0",
    10,
  );
}

export function setLevelScore(level: number, score: number): void {
  const current = getLevelScore(level);
  if (score > current) {
    localStorage.setItem(`${PREFIX}score_L${level}`, String(score));
  }
}

export function getLevelStars(level: number): number {
  return parseInt(
    localStorage.getItem(`${PREFIX}stars_L${level}`) ?? "0",
    10,
  );
}

export function setLevelStars(level: number, stars: number): void {
  const current = getLevelStars(level);
  if (stars > current) {
    localStorage.setItem(`${PREFIX}stars_L${level}`, String(stars));
  }
}
