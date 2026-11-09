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
  place(1, "cafe_for_birds", 13, 9, 3, 3),
  place(2, "red_tower", 13, 1, 2, 2),
  place(3, "color_frames", 2, 6, 2, 2),
  place(4, "house_blue", 1, 13, 2, 2),
  place(5, "house_gold", 5, 13, 2, 2),
  place(6, "red_pavilion", 13, 5, 2, 2),
  place(7, "yellow_bus", 13, 3, 2, 1),
  place(8, "red_bridge", 4, 4, 2, 1),
  place(9, "red_bridge", 8, 8, 2, 1),
  place(10, "canal_boat", 2, 2, 1, 1),
  place(11, "canal_boat", 6, 6, 1, 1),
  place(12, "canal_boat", 11, 11, 1, 1),
  place(13, "round_tree", 6, 1, 1, 1),
  place(14, "round_tree", 10, 1, 1, 1),
  place(15, "round_tree", 9, 5, 1, 1),
  place(16, "round_tree", 11, 6, 1, 1),
  place(17, "round_tree", 1, 10, 1, 1),
  place(18, "round_tree", 6, 10, 1, 1),
  place(19, "round_tree", 9, 10, 1, 1),
  place(20, "round_tree", 7, 14, 1, 1),
  place(21, "pointed_tree", 3, 1, 1, 1),
  place(22, "pointed_tree", 10, 6, 1, 1),
  place(23, "pointed_tree", 15, 13, 1, 1),
  place(24, "bench", 1, 15, 1, 1),
  place(25, "bench", 6, 9, 1, 1),
  place(26, "blue_bird", 7, 10, 1, 1),
  place(27, "red_bird", 11, 2, 1, 1),
  place(28, "gold_bird", 3, 10, 1, 1),
  place(29, "bird_cyclist", 9, 6, 1, 1),
];
