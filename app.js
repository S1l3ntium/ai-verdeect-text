const BACKGROUND_COLORS = ["#ffffff"];
const [PI_DOUBLE, PI_HALF, PI_QUARTER] = [
  Math.PI * 2,
  Math.PI / 2,
  Math.PI / 4
];

const COLOR_MAX = 255;
const BASE_COLOR = [0.462, 0.051, 1];

const getRGB = ([red, green, blue]) =>
  `rgb(${Math.floor(red * COLOR_MAX)}, ${Math.floor(
    green * COLOR_MAX
  )}, ${Math.floor(blue * COLOR_MAX)})`;

class Vector {
  static getLength(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  static getDistance(pointA, pointB) {
    return Vector.getLength(pointA.x - pointB.x, pointA.y - pointB.y);
  }

  static getDifference(pointA, pointB) {
    return new Vector(pointA.x - pointB.x, pointA.y - pointB.y);
  }

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  get length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  add(vector) {
    this.x += vector.x;
    this.y += vector.y;
  }

  multiply(value) {
    this.x *= value;
    this.y *= value;
  }

  angleTo(vector) {
    return Math.atan2(vector.y - this.y, vector.x - this.x);
  }

  distanceTo(vector) {
    return Vector.getDistance(this, vector);
  }
}

class Particle {
  constructor({ position, radius, damping }) {
    this.position = new Vector(position.x, position.y);
    this.radius = radius;
    this.damping = damping;
    this.mass = 1;
    this.acceleration = new Vector();
    this.velocity = new Vector();
    this.gravityObjects = [];
  }

  get x() {
    return this.position.x;
  }

  get y() {
    return this.position.y;
  }

  applyPhysic() {
    this.gravityObjects.forEach((gravityObject) => {
      const rawDistance = Vector.getDistance(gravityObject, this);
      const distance = Math.max(rawDistance, 20);
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

class Spring extends Particle {
  constructor({ position, center, radius, stiffness, damping }) {
    super({ position, radius, damping });
    this.center = new Vector(center.x, center.y);
    this.stiffness = stiffness;
    this.force = new Vector();
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

        const centerPos = {
          x: i * BLOCK_SIZE + (width - texture.width) / 2,
          y: j * BLOCK_SIZE + (height - texture.height) / 2
        };
        const position = {
          x: centerPos.x + (Math.random() - Math.random()) * MAX_OFFSET_X,
          y: centerPos.y + (Math.random() - Math.random()) * MAX_OFFSET_Y
        };

        const particle = new Spring({
          position,
          radius,
          center: centerPos,
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

function getTextTexture(text, fontSize) {
  const lines = text.split("\n");
  const lineHeight = fontSize * 1.2;

  const canvasEl = new OffscreenCanvas(1024, 768);
  const context = canvasEl.getContext("2d");

  context.font = `bold ${fontSize}px Arial`;
  const maxWidth = Math.max(
    ...lines.map((line) => context.measureText(line).width)
  );
  const totalHeight = lines.length * lineHeight;

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

function getBackgroundColor(context, width, height) {
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
