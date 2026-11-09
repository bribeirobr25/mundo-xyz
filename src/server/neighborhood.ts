/** Administrator scenery from prototype 00. These rows are not visitor publishes. */

export type SeedPlace = {
  id: string;
  contributionId: string;
  asset: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

function nid(n: number): string {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

function place(n: number, asset: string, x: number, y: number, w: number, h: number): SeedPlace {
  return { id: nid(0x300 + n), contributionId: nid(0x400 + n), asset, x, y, w, h };
}

export const NEIGHBORHOOD: SeedPlace[] = [
  place(1, "cafe_for_birds", 11, 5, 3, 3),
  place(2, "red_tower", 12, 2, 2, 2),
  place(3, "color_frames", 3, 5, 2, 2),
  place(4, "house_blue", 2, 12, 2, 2),
  place(5, "house_gold", 4, 13, 2, 2),
  place(6, "red_pavilion", 14, 6, 2, 2),
  place(7, "yellow_bus", 14, 4, 2, 1),
  place(8, "red_bridge", 4, 8, 1, 3),
  place(9, "red_bridge", 9, 8, 1, 3),
  place(10, "canal_boat", 2, 9, 1, 1),
  place(11, "canal_boat", 7, 10, 1, 1),
  place(12, "canal_boat", 11, 9, 1, 1),
  place(13, "round_tree", 6, 2, 1, 1),
  place(14, "round_tree", 8, 1, 1, 1),
  place(15, "round_tree", 6, 5, 1, 1),
  place(16, "round_tree", 14, 1, 1, 1),
  place(17, "round_tree", 1, 11, 1, 1),
  place(18, "round_tree", 6, 12, 1, 1),
  place(19, "round_tree", 8, 14, 1, 1),
  place(20, "round_tree", 15, 12, 1, 1),
  place(21, "round_tree", 3, 1, 1, 1),
  place(22, "round_tree", 7, 6, 1, 1),
  place(23, "round_tree", 15, 14, 1, 1),
  place(24, "bench", 1, 15, 1, 1),
  place(25, "bench", 6, 11, 1, 1),
  place(26, "blue_bird", 7, 12, 1, 1),
  place(27, "red_bird", 5, 2, 1, 1),
  place(28, "gold_bird", 3, 11, 1, 1),
  place(29, "bird_cyclist", 8, 6, 1, 1),
  place(30, "shrub", 5, 6, 1, 1),
  place(31, "shrub", 9, 2, 1, 1),
  place(32, "shrub", 10, 6, 1, 1),
  place(33, "shrub", 3, 14, 1, 1),
  place(34, "shrub", 2, 7, 1, 1),
  place(35, "shrub", 1, 7, 1, 1),
  place(36, "bird_cyclist", 5, 7, 1, 1),
  place(37, "bird_cyclist", 2, 11, 1, 1),
  place(38, "blue_bird", 7, 1, 1, 1),
  place(39, "red_bird", 14, 11, 1, 1),
  place(40, "bench", 3, 15, 1, 1),
  place(41, "round_tree", 15, 11, 1, 1),
  place(42, "round_tree", 9, 13, 1, 1),
];
