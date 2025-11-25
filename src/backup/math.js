// math.js

export const rotateVertices = (vertices, angleX, angleY, angleZ) => {
  const sinX = Math.sin(angleX), cosX = Math.cos(angleX);
  const sinY = Math.sin(angleY), cosY = Math.cos(angleY);
  const sinZ = Math.sin(angleZ), cosZ = Math.cos(angleZ);

  // Pre-allocate array to avoid dynamic resizing
  const result = new Array(vertices.length);

  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    // Handle both array and object formats safely
    const x = v.x ?? v[0];
    const y = v.y ?? v[1];
    const z = v.z ?? v[2];

    // X-Axis Rotation
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    const x1 = x;

    // Y-Axis Rotation
    const x2 = x1 * cosY + z1 * sinY;
    const z2 = -x1 * sinY + z1 * cosY;
    const y2 = y1;

    // Z-Axis Rotation
    const x3 = x2 * cosZ - y2 * sinZ;
    const y3 = x2 * sinZ + y2 * cosZ;
    const z3 = z2;

    result[i] = { x: x3, y: y3, z: z3 };
  }
  
  return result;
};