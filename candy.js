export const CANDY_TYPES = ["blue", "green", "orange", "purple", "red", "yellow"];

export function randomCandy() {
  return CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)];
}

export function candyImage(cell) {
  if (cell.special === "colorBomb") return "/assets/specials/color-bomb.png";
  if (cell.special === "wrapped") return `/assets/specials/${cell.candy}bm.png`;
  if (cell.special === "striped") return `/assets/specials/${cell.candy}çz.png`;

  return `/assets/candies/${cell.candy}.png`;
}