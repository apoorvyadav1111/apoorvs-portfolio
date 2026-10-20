// The toys you can throw, each with its own flight and its own look (drawn
// from above, centred on (0, 0)). `gravity` pulls the toy back down from its
// height above the lawn; `bounce` is how much of a landing it keeps; `roll`
// is how much speed it keeps per second along the grass; `drag` slows it in
// the air; `spin` is how fast it turns while flying.

export type ToyKind = "ball" | "stick" | "frisbee" | "bone";

export interface Toy {
  name: string;
  gravity: number; // px/s²
  bounce: number; // 0–1
  roll: number; // 0–1, kept per second on the ground
  drag: number; // 0–1, kept per second in the air
  spin: number; // rad/s while flying
  lift: number; // how high a flick sends it, relative to a ball
  crosswise?: boolean; // carried across the mouth, like a stick, not pointing ahead
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export const TOYS: Record<ToyKind, Toy> = {
  ball: {
    name: "Ball",
    gravity: 1500,
    bounce: 0.5,
    roll: 0.35,
    drag: 0.98,
    spin: 0,
    lift: 1,
    draw(ctx) {
      ctx.fillStyle = "#d8e34a";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(-6.5, 0, 5, -0.9, 0.9);
      ctx.arc(6.5, 0, 5, Math.PI - 0.9, Math.PI + 0.9);
      ctx.stroke();
    },
  },
  stick: {
    name: "Stick",
    gravity: 1600,
    bounce: 0.15,
    roll: 0.02,
    drag: 0.95,
    spin: 11,
    lift: 1.1,
    crosswise: true,
    draw(ctx) {
      ctx.strokeStyle = "#7a5230";
      ctx.lineCap = "round";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-18, 1);
      ctx.quadraticCurveTo(0, -2, 18, 0);
      ctx.stroke();
      // A twig and a knot
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(4, -1);
      ctx.lineTo(10, -7);
      ctx.stroke();
      ctx.fillStyle = "#5c3d22";
      ctx.beginPath();
      ctx.arc(-7, 0.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  frisbee: {
    name: "Frisbee",
    gravity: 480, // it glides
    bounce: 0,
    roll: 0.06,
    drag: 0.82,
    spin: 14,
    lift: 0.45,
    draw(ctx) {
      ctx.fillStyle = "#e4553f";
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0.3, 1.6);
      ctx.stroke();
    },
  },
  bone: {
    name: "Bone",
    gravity: 1500,
    bounce: 0.3,
    roll: 0.08,
    drag: 0.96,
    spin: 8,
    lift: 1,
    crosswise: true,
    draw(ctx) {
      ctx.fillStyle = "#f3ead7";
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-10, -3, 20, 6, 3);
      for (const x of [-11, 11])
        for (const y of [-3.5, 3.5]) {
          ctx.moveTo(x + 4, y);
          ctx.arc(x, y, 4, 0, Math.PI * 2);
        }
      ctx.fill();
      ctx.stroke();
    },
  },
};

export const TOY_KINDS = Object.keys(TOYS) as ToyKind[];
