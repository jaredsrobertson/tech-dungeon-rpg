// src/utils/math.js

// Pre-allocate a large buffer of vertex objects to reuse.
// This prevents Garbage Collection pauses by avoiding new object creation during the render loop.
// 2000 is sufficient for low-poly shapes (Cube=8 verts, Dodecahedron=20 verts).
const CACHE_SIZE = 2000;
const VERTEX_CACHE = new Array(CACHE_SIZE).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));

export const rotateVertices = (vertices, angleX, angleY, angleZ) => {
  const sinX = Math.sin(angleX), cosX = Math.cos(angleX);
  const sinY = Math.sin(angleY), cosY = Math.cos(angleY);
  const sinZ = Math.sin(angleZ), cosZ = Math.cos(angleZ);

  // We will populate and return this array. 
  // Note: The array contains references to the persistent VERTEX_CACHE objects.
  const result = []; 

  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    // Handle input flexibility: supports both [x,y,z] arrays and {x,y,z} objects
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

    // Safety check: Expand cache if we somehow have more vertices than expected
    if (!VERTEX_CACHE[i]) {
        VERTEX_CACHE[i] = { x: 0, y: 0, z: 0 };
    }

    // MUTATION: Update the existing object in the cache
    const cachedVertex = VERTEX_CACHE[i];
    cachedVertex.x = x3;
    cachedVertex.y = y3;
    cachedVertex.z = z3;

    result.push(cachedVertex);
  }
  
  return result;
};