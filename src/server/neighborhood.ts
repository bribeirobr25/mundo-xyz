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
  place(1, "cafe_for_birds", 8, 2, 3, 3),
  place(2, "red_tower", 7, 0, 2, 2),
  place(3, "color_frames", 2, 1, 2, 2),
  place(4, "house_blue", 0, 2, 2, 2),
  place(5, "house_gold", 1, 11, 2, 2),
  place(6, "red_pavilion", 12, 2, 2, 2),
  place(7, "yellow_bus", 6, 5, 2, 1),
  place(8, "red_bridge", 1, 6, 2, 1),
  place(9, "red_bridge", 7, 7, 2, 1),
  place(10, "canal_boat", 3, 7, 1, 1),
  place(11, "canal_boat", 5, 7, 1, 1),
  place(12, "canal_boat", 12, 8, 1, 1),
  place(13, "round_tree", 4, 3, 1, 1),
  place(14, "round_tree", 6, 3, 1, 1),
  place(15, "round_tree", 0, 1, 1, 1),
  place(16, "round_tree", 15, 3, 1, 1),
  place(17, "round_tree", 12, 0, 1, 1),
  place(18, "round_tree", 5, 4, 1, 1),
  place(19, "round_tree", 3, 12, 1, 1),
  place(20, "round_tree", 5, 13, 1, 1),
  place(21, "round_tree", 10, 12, 1, 1),
  place(22, "round_tree", 13, 13, 1, 1),
  place(23, "bench", 6, 4, 1, 1),
  place(24, "bench", 11, 12, 1, 1),
  place(25, "bench", 8, 6, 1, 1),
  place(26, "blue_bird", 5, 5, 1, 1),
  place(27, "red_bird", 11, 5, 1, 1),
  place(28, "gold_bird", 0, 12, 1, 1),
  place(29, "bird_cyclist", 3, 5, 1, 1),
  place(30, "bird_cyclist", 15, 6, 1, 1),
  place(31, "bird_cyclist", 0, 5, 1, 1),
  place(32, "shrub", 4, 2, 1, 1),
  place(33, "shrub", 15, 10, 1, 1),
  place(34, "shrub", 12, 4, 1, 1),
  place(35, "shrub", 2, 13, 1, 1),
  place(36, "shrub", 14, 13, 1, 1),
  place(37, "bird_cyclist", 7, 12, 1, 1),
  place(38, "blue_bird", 15, 12, 1, 1),
  place(39, "red_bird", 3, 0, 1, 1),
  place(40, "gold_bird", 0, 14, 1, 1),
  place(41, "pointed_tree", 11, 1, 1, 1),
  place(42, "pointed_tree", 14, 12, 1, 1),
];
