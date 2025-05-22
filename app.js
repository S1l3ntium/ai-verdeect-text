const BACKGROUND_COLORS = ["#ffffff"];
const [PI_DOUBLE, PI_HALF, PI_QUARTER] = [
  Math.PI * 2,
  Math.PI / 2,
  Math.PI / 4
];

const COLOR_MAX = 255;
const BASE_COLOR = [0.462, 0.051, 1];

const getRGB = ([red, green, blue]: [number, number, number]) =>
  `rgb(${Math.floor(red * COLOR_MAX)}, ${Math.floor(
    green * COLOR_MAX
  )}, ${Math.floor(blue * COLOR_MAX)})`;

interface IPoint {
  x: number;
  y: number;
}

interface IVector extends IPoint {
  readonly length: number;
  multiply(vector: IPoint): void;
  add(vector: IPoint): void;
  distanceTo(vector: IPoint): number;
  angleTo(vector: IPoint): number;
}

class Vector implements IVector {
  private static getLength(x: number, y: number): number {
    return Math.sqrt(x * x + y * y);
  }

  public static getDistance(pointA: IPoint, pointB: IPoint): number {
    return Vector.getLength(pointA.x - pointB.x, pointA.y - pointB.y);
  }

  public static getDifference(pointA: IPoint, pointB: IPoint): IVector {
    return new Vector(pointA.x - pointB.x, pointA.y - pointB.y);
  }

  x: number;
  y: number;

  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add({ x, y }: IPoint) {
    this.x += x;
    this.y += y;
  }

  multiply(value: number) {
    this.x *= value;
    this.y *= value;
  }

  angleTo(vector: IPoint): number {
    return Math.atan2(vector.y - this.y, vector.x - this.x);
  }

  distanceTo(vector: IPoint): number {
    return Vector.getDistance(this, vector);
  }
}

class Particle implements IVector {
  public radius: number = 1;
  public mass: number = 1;

  public position: IVector;
  public acceleration: IVector = new Vector();
  public velocity: IVector = new Vector();
  public damping: number = 0;
  public gravityObjects: Particle[] = [];

  get x(): number {
    return this.position.x;
  }

  get y(): number {
    return this.position.y;
  }

  constructor({
    position: { x, y },
    radius,
    damping
  }: {
    position: IPoint;
    radius: number;
    damping: number;
  }) {
    this.position = new Vector(x, y);
    this.radius = radius;
    this.damping = damping;
  }

  applyPhysic() {
    this.gravityObjects.forEach((gravityObject) => {
      //const distance = Vector.getDistance(gravityObject, this);
      const rawDistance = Vector.getDistance(gravityObject, this);
      const distance = Math.max(rawDistance, 20); // ← минимальная дистанция, чтобы избежать бесконечно сильного отталкивания
      const angle = this.position.angleTo(gravityObject);
      const force =
        (gravityObject.mass + this.mass) / (distance * distance) || 0;
      const gravity = new Vector(
        Math.cos(angle) * force,
        Math.sin(angle) * force
      );
      this.velocity.add(gravity);
    });

    this.velocity.add(this.acceleration);
    this.velocity.multiply(1 - this.damping);
    this.position.add(this.velocity);
  }
}

class Spring extends Particle implements IVector {
  force: IVector;
  center: IVector;
  stiffness: number = 1;

  private weight: IVector;

  constructor({
    position,
    center,
    radius,
    stiffness,
    damping
  }: {
    position: IPoint;
    center: IPoint;
    radius: number;
    stiffness: number;
    damping: number;
  }) {
    super({ position, radius, damping });

    this.center = new Vector(center.x, center.y);
    this.stiffness = stiffness;
  }

  applyPhysic() {
    this.force = Vector.getDifference(this.center, this.position);
    this.force.multiply(this.stiffness);

    this.velocity.add(this.force);

    super.applyPhysic();
  }
}

function main() {
  const canvasEl = document.getElementById("canvas");
  const context = canvasEl.getContext("2d");
  let { width, height } = canvasEl;

  const resize = () => {
    const { innerHeight, innerWidth } = window;

    canvasEl.width = innerWidth;
    canvasEl.height = innerHeight;
    width = innerWidth;
    height = innerHeight;
  };

  window.addEventListener("resize", resize);
  resize();

  const MAX_DISTANCE = 200;
  const BLOCK_SIZE = 4;
  const BYTE_OFFSET = 4;
  const MAX_SIZE = 3;
  const MAX_OFFSET_X = 40;
  const MAX_OFFSET_Y = 10;

  //const texture = getTextTexture("HELL O WORLD", 80);
  const texture = getTextTexture("Нейросеть\nвнутри вашей\nкомпании", 80);
  const center = {
    x: width / 2,
    y: height / 2
  };
  const radius = texture.width / 2;
  const particles = [];

  const repulsor = new Particle({
    position: { x: center.x - 50, y: center.y - 10 },
    radius: 0,
    damping: 0
  });
  repulsor.mass = -10000;

  for (let i = 0; i < texture.width / BLOCK_SIZE; i++) {
    for (let j = 0; j < texture.height / BLOCK_SIZE; j++) {
      const offset =
        Math.floor(
          j * BLOCK_SIZE * texture.width + i * BLOCK_SIZE + BLOCK_SIZE / 2
        ) * BYTE_OFFSET;

      if (texture.data[offset]) {
        const radius = MAX_SIZE / 2 + (Math.random() * MAX_SIZE) / 2;
        const stiffness = 0.002 + Math.random() * 0.05;
        const damping = 0.01 + Math.random() * 0.1;
        const angle = Math.random() * PI_DOUBLE;
        const distance = Math.random() * MAX_DISTANCE;

        const center = {
          x: i * BLOCK_SIZE + (width - texture.width) / 2,
          y: j * BLOCK_SIZE + (height - texture.height) / 2
        };
        const position = {
          x: center.x + (Math.random() - Math.random()) * MAX_OFFSET_X,
          y: center.y + (Math.random() - Math.random()) * MAX_OFFSET_Y
        };

        const particle = new Spring({
          position,
          radius,
          center,
          stiffness,
          damping
        });

        particle.gravityObjects.push(repulsor);

        particles.push(particle);
      }
    }
  }

  canvasEl.addEventListener("mousemove", ({ clientX, clientY }) => {
    repulsor.position.x = clientX;
    repulsor.position.y = clientY;
  });

  const maxRadius = Math.sqrt(((texture.width / 2) * texture.width) / 2);

  const backgroundColor = getBackgroundColor(context, width, height);

  const step = () => {
    const { width, height } = canvasEl;

    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    context.save();

    particles.forEach((particle) => {
      particle.applyPhysic();

      context.save();
      context.translate(particle.x, particle.y);

      const colorScale = particle.radius / MAX_SIZE;

      context.fillStyle = getRGB([
        BASE_COLOR[0] * colorScale,
        BASE_COLOR[1],
        BASE_COLOR[2]
      ]);

      context.beginPath();

      context.arc(0, 0, particle.radius, 0, PI_DOUBLE);

      context.fill();
      context.restore();
    });

    context.restore();

    requestAnimationFrame(step);
  };

  requestAnimationFrame(() => step(context));
  step(context);
}

//function getTextTexture(text: string, fontSize: number) {
//  const canvasEl = new OffscreenCanvas(1024, 768);
//  const context = canvasEl.getContext("2d");

//  context.fillStyle = "#FFFFFF";
//context.textAlign = "left";
//context.textBaseline = "top";
//context.font = `bold ${fontSize}px Arial`;
//context.fillText(text, 0, 0);

//const { width } = context.measureText(text);

//return context.getImageData(0, 0, width, fontSize);
//}

function getTextTexture(text: string, fontSize: number) {
  const lines = text.split("\n"); // разбиваем по строкам
  const lineHeight = fontSize * 1.2;

  // Вычисляем максимальную ширину строки
  const canvasEl = new OffscreenCanvas(1024, 768);
  const context = canvasEl.getContext("2d");

  context.font = `bold ${fontSize}px Arial`;
  const maxWidth = Math.max(
    ...lines.map((line) => context.measureText(line).width)
  );
  const totalHeight = lines.length * lineHeight;

  // Подгоняем размер канваса
  canvasEl.width = Math.ceil(maxWidth);
  canvasEl.height = Math.ceil(totalHeight);

  context.font = `bold ${fontSize}px Arial`;
  context.fillStyle = "#FFFFFF";
  context.textAlign = "left";
  context.textBaseline = "top";

  lines.forEach((line, index) => {
    context.fillText(line, 0, index * lineHeight);
  });

  return context.getImageData(0, 0, canvasEl.width, canvasEl.height);
}

function getBackgroundColor(context, width: number, height: number) {
  const gradient = context.createRadialGradient(
    width / 2,
    height / 2,
    280,
    width / 2,
    height / 2,
    520
  );
  BACKGROUND_COLORS.forEach((color, index) => {
    gradient.addColorStop(index, color);
  });

  return gradient;
}

document.addEventListener("DOMContentLoaded", main);
