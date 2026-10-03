import * as THREE from "three";
import { buildAmazonFish, buildAmazonRay } from "./creature_amazon_fish.js";
import {
  buildAmazonReptile,
  buildAmazonSerpent,
  buildAmazonTurtle,
} from "./creature_amazon_reptiles.js";
export const AMAZON_CREATURE_KINDS = new Set([
  "neon_tetra",
  "amazon_discus",
  "silver_hatchet",
  "armored_cory",
  "amazon_pacu",
  "silver_arowana",
  "arapaima",
  "redtail_catfish",
  "amazon_river_turtle",
  "red_piranha",
  "electric_eel",
  "river_stingray",
  "black_caiman",
  "green_anaconda",
  "saltwater_crocodile",
  "titanoboa",
  "purussaurus",
  "stupendemys",
  "flood_arapaima",
  "rootback_colossus",
  "yacumama",
  "rootjaw",
]);
/** 原创河流解剖模型；统一 -Z 头向、全长归一、实际图鉴与游戏共用。 */
export function buildAmazonCreature(kind, root, motions) {
  if (!AMAZON_CREATURE_KINDS.has(kind))
    throw new Error(`Unknown Amazon creature: ${kind}`);
  const body = new THREE.Group();
  body.name = `${kind}_freshwater_anatomy`;
  root.add(body);
  if (["green_anaconda", "titanoboa", "yacumama"].includes(kind))
    buildAmazonSerpent(kind, body, motions);
  else if (
    [
      "black_caiman",
      "saltwater_crocodile",
      "purussaurus",
      "rootback_colossus",
      "rootjaw",
    ].includes(kind)
  )
    buildAmazonReptile(kind, body, motions);
  else if (["amazon_river_turtle", "stupendemys"].includes(kind))
    buildAmazonTurtle(kind, body, motions);
  else if (kind === "river_stingray") buildAmazonRay(body, motions);
  else buildAmazonFish(kind, body, motions);
  body.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(body),
    scale = 1 / bounds.getSize(new THREE.Vector3()).z;
  body.scale.setScalar(scale);
  body.position
    .copy(bounds.getCenter(new THREE.Vector3()))
    .multiplyScalar(-scale);
  root.userData.normalizedLength = 1;
  root.userData.amazonAnatomy = kind;
  root.userData.artRevision = "amazon_redraw_v2";
}
