# RepoScripter Conceptual Library

This file contains distilled guidance on natural and mathematical coding concepts. These are not mandatory rules for every generation, but rather a toolbox of patterns to be used when relevant to the "Weird Code Guy" persona's goals.

## Core Directives
- **Persona First**: Always prioritize the "strange mechanism" and feral design-brain.
- **Math as a Tool**: Use the following lessons to make weirdness more visceral, complex, or physically grounded.

---
<!-- Lessons will be appended below -->

### Lesson: Hyperbolic Image Tiling
- **Non-Euclidean Propagation**: Tiling is not flat repetition; it is the propagation of a seed tile through curved space via reflection.
- **Structural Parameters**: Use `p` (sides in base polygon) and `q` (polygons meeting at each vertex) as deep structural controls.
- **Boundary Behavior**: Visual power comes from compression and edge-density accelerating toward the "infinity-edge" or boundary.
- **Reverse Mapping**: For transformed/curved imagery, calculate where each output point came from in the source tile (reverse mapping) rather than stamping pixels forward.
- **Expressive Pipeline**: Separate the content of the tile from how it is warped and how it is repeated (Seed -> Warp -> Propagate).
- **Core Philosophy**: Don't just draw many things. Define the seed, the transformation law, and the geometry it lives inside.

### Lesson: Quasicrystal Thinking
- **Wave Interference as Construction**: Don't draw shapes; sum simple directional fields (waves) overlapping in space to let complexity emerge from interference.
- **Structural Controls**: Use the number of waves and their angular separation to drive symmetry and order. Even spacing creates crystals; irregular spacing creates strange hybrids.
- **Field Equations over Object Placement**: Evaluate a formula everywhere (per pixel/sample) rather than manually placing decorative motifs.
- **Phase Animation**: Animate the pattern by shifting the phase of the underlying waves over time, making the structure itself feel alive.
- **Response Functions**: Exchange the base function (e.g., swapping `cos` for `tan`) to radically alter the emotional texture from elegant interference to noisy turbulence.
- **Signal Remapping**: Remap the summed intensity (folding, wrapping, thresholding) to define the final visible form. The pattern comes from how the field is interpreted.

### Lesson: Technical Implementation (GPU & Advanced Logic)
- **Reaction-Diffusion (GPU)**: Use WebGL and Ping-Pong buffers to run Gray-Scott equations. Store concentrations in Red/Green channels of data textures. Interpolate feed/kill rates based on underlying image brightness.
- **Multiple Neighborhoods CA (MNCA)**: Upgrade standard CA to check multiple, progressively larger neighborhood patterns. Maintain two 2D arrays for current/next states to avoid overwriting during calculation.
- **Object-Oriented Fractals**: Use classes to store vertices and midpoints. Project inward "struts" using trig. Use Perlin noise to vary strut length (Noise Inversion) for chaotic, shifting geometry.
- **3D Flow Fields & Verlet Physics**: Use 3D noise (x, y, time) for animated flow fields. Use Verlet integration (position - previous position) for stable soft bodies. Apply inverse kinematic constraints by manually adjusting point distances to rest lengths.
- **GPU Instancing & Post-Processing**: Use Simplex noise for faster GPU performance. Use instancing (`instanceID`) to render thousands of particles simultaneously. Implement Bloom by blurring a scene in a separate framebuffer and adding it back with additive blending.

### Lesson: Reaction-Diffusion (CPU)
- **The Overwrite Problem**: You cannot overwrite the grid while processing it, as new cell states depend on the *previous* states of neighbors.
- **Two-Array Solution**: Maintain `current` and `next` arrays. Read from `current`, write to `next`, then swap (`current = next`) after the full grid pass.
- **Laplacian (Neighborhood Blur)**: Calculate diffusion by weight-summing a 3x3 neighborhood (center = -1, adjacent = 0.2, diagonal = 0.05).
- **Reaction Equation (Gray-Scott)**: Apply `A * B * B` reaction logic. Chemical A is added at a "feed rate", Chemical B is removed at a "kill rate".
- **Direct Pixel Manipulation**: Use the `pixels` array instead of `rect()` for performance.
- **Optimization**: Run multiple mathematical iterations per visual frame to speed up growth.

### Lesson: MNCA Optimization via Convolutions
- **Multiple Neighborhoods**: Evaluate four distinct, progressively larger neighborhood patterns (`sum_0` to `sum_3`) per cell.
- **Threshold Logic**: Apply specific birth/death ranges to these sums (e.g., death if `sum_3 > 108`, life if `sum_0` is 40-42).
- **Channel Packing**: Optimize by packing four neighborhood patterns into the Red, Green, Blue, and Alpha channels of a single convolution kernel.
- **Single Pass Execution**: Perform the convolution once to yield a matrix where each pixel's RGBA values contain the four neighborhood sums simultaneously.
- **Hardware Acceleration**: This technique is ideal for WebGL shaders or FFT-based math libraries to maintain high frame rates with large neighborhoods.

### Lesson: Advanced CA (History, Probability, & Topology)
- **Dual-Buffering (Simultaneity Paradox)**: Always maintain `current` and `next` arrays. Calculate `next` by reading from `current`, then swap: `current = next`.
- **State History & Transitions**: Track `current` and `previous` states to color transitional events (e.g., birth vs. death). Map cell "age" (consecutive frames) to color gradients for rich visuals.
- **Probabilistic & Continuous Rules**: Introduce randomness to survival conditions (e.g., 80% death chance) to make patterns feel organic. Use floating-point states (0.0-1.0) for soft fading and ghosting trails.
- **Non-Rectangular & Dynamic Grids**: Use hexagonal grids or untether cells entirely, treating them as moving particles (boids) with neighborhoods that change based on physical proximity.
- **Pixel-Level Performance**: For massive colonies, map states directly to the `pixels` array instead of using `rect()` or `ellipse()` to avoid performance bottlenecks.
- **Memory & Topology**: Pre-allocate `current` and `next` arrays during setup and swap them to avoid GC thrashing. Implement "wrap-around" (toroidal) logic for seamless, infinite edges.

### Lesson: Advanced CA (History, Probability, & Topology)
- **Dual-Buffering (Simultaneity Paradox)**: Always maintain `current` and `next` arrays. Calculate `next` by reading from `current`, then swap: `current = next`.
- **State History & Transitions**: Track `current` and `previous` states to color transitional events (e.g., birth vs. death). Map cell "age" (consecutive frames) to color gradients for rich visuals.
- **Probabilistic & Continuous Rules**: Introduce randomness to survival conditions (e.g., 80% death chance) to make patterns feel organic. Use floating-point states (0.0-1.0) for soft fading and ghosting trails.
- **Non-Rectangular & Dynamic Grids**: Use hexagonal grids or untether cells entirely, treating them as moving particles (boids) with neighborhoods that change based on physical proximity.
- **Pixel-Level Performance**: For massive colonies, map states directly to the `pixels` array instead of using `rect()` or `ellipse()` to avoid performance bottlenecks.
- **Memory & Topology**: Pre-allocate `current` and `next` arrays during setup and swap them to avoid GC thrashing. Implement "wrap-around" (toroidal) logic for seamless, infinite edges.

### Lesson: Continuous Cellular Automata (Lenia)
- **Continuous States**: Move beyond discrete 0/1 states to continuous values (0.0 to 1.0) per pixel. This creates fluid, biological "creatures" that move and interact like microscopic life.
- **Circular Kernels**: Use circular neighborhoods (kernels) instead of square grids to calculate neighbor influences.
- **Growth Functions**: Apply growth functions (like a Bell curve) to the neighborhood sums to determine the rate of change for each cell.
- **Microscopic Realism**: This approach yields emergent behaviors that feel physically grounded and organic, moving away from the "grid-like" feel of traditional CA.

### Lesson: 4D Spatial Mechanics & Projections
- **4D Rotation Planes**: Rotations in 4D occur around 2D planes (XY, XZ, XW, YZ, YW, ZW). Use 4x4 transformation matrices and multiply them by 4D vectors `[x, y, z, w]`.
- **4D to 3D Projection**: Project a 4D point to 3D space using a perspective scalar based on the `w` axis: `1 / (distance - w)`. Multiply `x, y, z` by this scalar.
- **3D to 2D Projection**: Handled by the Vertex Shader in WebGL or abstracted by libraries like Three.js. It involves trigonometric transformations to map 3D points to the 2D screen.
- **CPU-Based Projection**: For pure Canvas 2D, center the origin via `translate(width/2, height/2)`. Apply perspective projection: `z_scale = 1 / (distance - z)`. Multiply `x` and `y` by `z_scale`.
- **Architecture**: Use **Three.js** for higher-dimensional or complex 3D visualizations. It abstracts matrix math, shader compilation, and buffer management.
- **4D Perspective Scalar Implementation**:
    1. **Define 4D Camera Distance**: Establish a distance along the $w$-axis.
    2. **Calculate Scalar**: `w_scale = 1 / (distance - w)`.
    3. **Project**: `x' = x * w_scale`, `y' = y * w_scale`, `z' = z * w_scale`.
- **WebGL Pipeline**: Pass projected 3D vertices to Three.js. The Vertex Shader handles the final projection to the 2D screen by setting `gl_Position` using model-view and projection matrices.
- **Optimization (Simplex vs Perlin)**: Standard noise requires $2^N$ corner interpolations (16 in 4D). Simplex noise uses $N+1$ corners (5 in 4D), reducing complexity by 11 corners. It also eliminates directional artifacts and uses a smoother quintic interpolation curve ($6x^5 - 15x^4 + 10x^3$).
- **Vector Projection & Dot Product**: Calculate the 4D dot product as `(Ax*Bx) + (Ay*By) + (Az*Bz) + (Aw*Bw)`. Project vector A onto B by normalizing B, taking the dot product of A and B_normalized (scalar projection), and multiplying B_normalized by that scalar.
- **4D Simplex Implementation**:
    - **Skewing**: Transform coordinates to simplex space using $F_4 = (\sqrt{5}-1)/4$.
    - **Traversal**: Identify the simplex cell by comparing magnitudes of skewed coordinates (e.g., $x > y > z > w$).
    - **Unskewing**: Map back to standard space using $G_4 = (5-\sqrt{5})/20$.
- **Verification Note**: Specific mathematical formulas for 4D-to-3D projection, 4D vector operations, and Simplex constants are drawn from outside information and should be independently verified before deployment.

### Lesson: Lindenmayer Systems (L-systems)
- **Formal Grammar**: Use an **Axiom** (starting string) and **Production Rules** (e.g., `A -> AB`) to recursively generate complex strings.
- **String Rewriting**: Iterate through the current string, applying rules to each character. Use an array and `.join('')` for performance when building massive strings (exponential growth).
    - **Optimization**: Avoid `+=` concatenation on strings (immutable objects). Instead, push replacement characters into an array buffer and `.join('')` at the end of the generation. This replicates the `StringBuffer` pattern to prevent memory crashes during exponential expansion.
    - **Implementation**:
      ```javascript
      let nextBuffer = [];
      for (let i = 0; i < current.length; i++) {
        let c = current.charAt(i);
        if (rules[c]) nextBuffer.push(rules[c]);
        else nextBuffer.push(c);
      }
      current = nextBuffer.join('');
      ```
- **Stochastic L-Systems**: Introduce probability to rules (e.g., `A -> AB` 70% of the time, `A -> AC` 30%). This ensures organic variation.
- **Turtle Graphics**: Translate the final string into visual geometry using a virtual "turtle."
    - `F`: Draw forward + translate.
    - `G`: Move forward (no draw).
    - `+` / `-`: Rotate right/left.
    - `[` / `]`: **Push/Pop Matrix** (`ctx.save()` / `ctx.restore()`) to handle branching structures like trees.
- **Recursive Complexity**: L-systems excel at modeling biological growth, fractals (Koch curve, Cantor set), and self-similar architectures.

### Lesson: Koch Curve L-system
- **Grammar**: Alphabet `{F, L, R}`.
- **Axiom**: `F`.
- **Rules**: `F -> FLFRFLF`.
- **Turtle Commands**:
    - `F`: Move forward + draw.
    - `L`: Turn left by 60°.
    - `R`: Turn right by 120°.
- **Growth**: Generation 0 is a line; Generation 1 is a peak; subsequent generations create recursive fractal edges.

### Lesson: Autonomous Agents & Flocking (Boids)
- **Concept**: Emergent group dynamics from simple local rules. An autonomous agent perceives its environment and calculates actions without a central leader.
- **Steering Formula**: `steering force = desired velocity - current velocity`. This acts as an error-correction mechanism.
- **The Three Core Rules**:
    - **Separation (Avoidance)**: Steer away from crowding neighbors. Calculate vectors pointing away from close neighbors, normalize, and divide by distance (flee more aggressively from closer threats).
    - **Alignment (Copy)**: Steer in the same direction as local flockmates. Calculate the average velocity of neighbors within a radius.
    - **Cohesion (Center)**: Steer toward the center of mass of local neighbors. Calculate the average location of neighbors and "seek" that target.
- **Implementation**: Accumulate these forces with adjustable weights.
- **Advanced Perception & Rules**:
    - **Field of View**: Limit perception to a forward-facing geometric cone.
    - **View (Gary Flake)**: Move laterally away from any boid that blocks the view.
    - **Obstacle Avoidance**: If an obstacle is detected within a threshold, calculate a desired velocity pointing exactly away from it. Apply the steering formula.
- **Optimization (Spatial Hash Grid / Bin-Lattice)**: Divide the canvas into a 2D grid. Agents only check neighbors in their own and adjacent cells. This reduces complexity from $O(N^2)$ to nearly $O(N)$.

### Lesson: Steering Behaviors (Seek & Flee)
- **Seek**: `desired velocity = target - position`. Normalize and scale to `maxspeed`.
- **Flee**: `desired velocity = position - target`. Normalize and scale to `maxspeed`.
- **Steering Calculation**: `force = desired - velocity`. Limit the magnitude by `maxforce` to simulate physical turning constraints.
- **Arrival**: Slow down as the agent approaches the target by scaling `desired velocity` based on distance when within a "slowing radius".

### Lesson: Force Fields & Repellers
- **Repellers**: Objects that push agents away.
- **Calculation**: Calculate a vector pointing from the repeller to the agent. Scale the force to be inversely proportional to the distance squared ($1/d^2$).
- **Weighting**: Avoidance/Repulsion forces are typically weighted higher than flocking forces (e.g., `avoid * 3.0` vs `cohesion * 1.0`) to prioritize survival over formation.

### Lesson: Cellular Automata (CA) Variations
- **1D/2D CA**: Grids of cells evolving based on neighbor states.
- **Game of Life**: Standard 2D survival/birth rules.
- **Vichniac Vote**: Models conformity; cell changes state if it's in the minority.
- **Brian's Brain**: Three states (Firing, Resting, Off); resembles neural synapse firing.

### Lesson: Evolutionary Computing & Genetic Algorithms
- **Genotype**: Digital DNA (data structure). An array of parameters (0.0 to 1.0) representing traits.
- **Phenotype**: Visual expression/behavior of the DNA (e.g., a specific fractal tree).
- **Fitness Function**: Numerical evaluation of performance.
- **Interactive Selection (IEC)**: Use the **User as the Fitness Function**. Evolve art based on user preference.
- **Selection**: Mating pool of successful genotypes.
- **Variation**: Crossover (mixing DNA) and Mutation (randomly flipping bits).
- **Vibecode Trick**: Map DNA to **Shader Uniforms** to evolve the logic of light and texture.

### Lesson: Artificial Neural Networks (Perceptrons)
- **Perceptron**: Simple model receiving multiple inputs, processing with weights, and producing an output.
- **Activation Functions**: Use `tanh` or `Sigmoid` to squash outputs between 0 and 1.
- **Learning**:
    - **Supervised**: Correcting errors based on known answers.
    - **Reinforcement**: Learning from environmental feedback (rewards/penalties).
- **Application**: Teaching agents to steer, recognize patterns, or adapt. Use as a **Brush Controller** to map inputs (speed, position) to visual traits (weight, hue).

### Lesson: Neuroevolution (NEAT)
- **Brain-Body Connection**: Give agents "sensors" (probes) and a Neural Network brain.
- **Evolving Topology**: Don't just evolve weights; evolve the architecture (adding/removing neurons).
- **Emergent Creativity**: Agents learn complex behaviors (e.g., swimming against currents) through generations of selection.

### Lesson: Advanced Physics & Libraries
- **Libraries**: Use **Box2D** or **toxiclibs** for complex mechanics.
- **Capabilities**: Polygon collisions, pendulums, elastic bridges, and joint constraints.
- **Efficiency**: Offload exhaustive collision math to specialized engines.

### Lesson: Verlet Integration (Physics of Squish)
- **Verlet Logic**: Store **Previous Position** instead of velocity. `velocity = currentPos - previousPos`.
- **Constraints (Relaxation Loop)**: Move points until they are the "correct" distance apart. Incredibly stable for ropes, cloth, and soft bodies.
- **Soft-Body Morphing**: Connect points with Verlet "sticks". Inflate shapes by increasing internal stick lengths.

### Lesson: Fluid Dynamics (Navier-Stokes)
- **Eulerian Grid**: Divide screen into cells storing Velocity and Density.
- **Advection**: Move density along velocity vectors.
- **Diffusion**: Spread density/velocity to neighbors.
- **Pressure/Divergence**: Balance "stuff" in cells to ensure incompressibility.
- **GPU Acceleration**: Use shader passes for Advection, Jacobi Iteration (pressure), and Divergence.

### Lesson: Reaction-Diffusion (Gray-Scott)
- **Gray-Scott Model**: Simulates chemical reaction/diffusion.
- **Parameters**:
    - **Feed Rate**: Addition of Chemical A.
    - **Kill Rate**: Removal of Chemical B.
    - **Diffusion Rate**: Spread to neighbors.
- **Visuals**: Brain coral, zebra stripes, cellular mitosis.

### Lesson: GLSL Shaders & Visual Effects
- **Vertex Shaders**: Transform geometry.
- **Fragment Shaders**: Define per-pixel color.
- **Effects**:
    - **Fresnel Effect**: View-dependent material appearance.
    - **Post-Processing**: High-performance visual filters.
- **Advanced Rendering**: Ray marching and SDFs for infinite fractals and complex lighting.

### Lesson: Ray Marching & Signed Distance Functions (SDFs)
- **Architecture**: Every pixel emits a virtual ray into the 3D scene. The ray steps forward based on the shortest signed distance to the nearest surface (SDF).
- **GPU Optimization**: Ray marching is ideal for GLSL fragment shaders, enabling real-time rendering of fractals and complex mathematical manifolds.
- **SDF Logic**: Use SDFs to define geometry mathematically (e.g., `length(p) - radius` for a sphere) rather than using explicit polygons.

### Lesson: Non-Euclidean Spaces & Hyperbolic Art
- **Mirror Rooms & Polyhedral Manifolds**: Space wraps around. Use **Modular Arithmetic** on Ray Marching positions: `p = mod(p, roomSize) - 0.5 * roomSize;`.
- **Hyperbolic Tiling (Poincaré Disk)**: Parallel postulate fails. Objects shrink infinitely as they approach the disk boundary.
- **Artistic Application**: Map L-Systems onto a hyperbolic plane for Escher-like "Circle Limit" effects.

### Lesson: Differential Growth (Math of Wrinkles)
- **Nodes and Springs**: Represent a boundary as connected nodes with Attraction (spring) and Repulsion (collision avoidance).
- **Injection**: If neighbors get too far apart, inject a new node.
- **Curvature-Based Injection**: Inject nodes where curvature is highest to create fractal-like ruffles (brains, kale, coral).

### Lesson: Strange Attractors (Portraits of Chaos)
- **Lorenz & Clifford Attractors**: Iterative functions sensitive to initial conditions.
- **Rendering**: Use **Additive Blending** and millions of semi-transparent points.
- **Density Mapping**: Map local hit-counts to HDR color ramps in a shader.

### Lesson: Domain Warping (Sculpting with Noise)
- **Nested Transformations**: `f(p) = noise( p + noise( p + noise( p ) ) )`.
- **GLSL Implementation**: Use **Fractional Brownian Motion (FBM)** octaves.
- **Vibe Shift**: Warp Worley noise with FBM for textures like stretched tissue or obsidian.

### Lesson: Particle-Life (Behavioral Chemistry)
- **Interaction Matrix**: Define attraction/repulsion forces between different "colors" of particles.
- **Emergent Taxonomy**: Evolve the matrix using Genetic Algorithms to discover complex multicellular-like organisms.

### Lesson: Coordinate Systems (Euclidean vs Polar/Spherical)
- **Euclidean (Cartesian)**: Standard $X/Y/Z$ grid. Best for linear, grid-based structures.
- **Polar (2D)**: Defined by radius ($r$) and angle ($\theta$). Best for circular paths and radial symmetry.
    - **Conversion**: $x = r \cdot \cos(\theta)$, $y = r \cdot \sin(\theta)$.
- **Spherical (3D)**: Defined by radius ($r$), azimuthal angle ($\theta$), and polar angle ($\phi$).
    - **Conversion**: $x = r \cdot \sin(\phi) \cdot \cos(\theta)$, $y = r \cdot \sin(\phi) \cdot \sin(\theta)$, $z = r \cdot \cos(\phi)$.

### Lesson: The Book of Shaders - Algorithmic Drawing
- **Shaping Functions**: Use `step(edge, x)` for binary thresholds and `smoothstep(edge0, edge1, x)` for smooth transitions. Use `pow()`, `exp()`, `log()`, and `sqrt()` to warp the linear flow of values.
- **Color Spaces**:
    - **HSB**: More intuitive for color picking. Map `x` to Hue and `y` to Brightness.
    - **YUV**: Used for analog encoding; bandwidth-efficient chrominance.
- **Polar Coordinates**: Convert Cartesian `(x, y)` to Polar `(r, theta)` using `length(st)` and `atan(y, x)`. This is essential for circular patterns and radial symmetry.
- **Distance Fields (SDF)**: Define shapes by the distance from a point to the shape's boundary.
    - **Circle**: `length(st - center) - radius`.
    - **Rectangle**: `max(abs(st.x), abs(st.y)) - size`.
    - **Combining**: Use `min()` for union, `max()` for intersection, and `clamp(a-b)` for subtraction.
- **2D Matrices**:
    - **Translate**: `st + offset`.
    - **Rotate**: `mat2(cos(a), -sin(a), sin(a), cos(a)) * st`.
    - **Scale**: `mat2(s.x, 0.0, 0.0, s.y) * st`.
    - **Order Matters**: Always translate to origin before rotating or scaling, then translate back.
- **Tiling & Patterns**:
    - **Fract**: Use `fract(st * zoom)` to repeat space.
    - **Truchet Tiles**: Use random rotation per cell to create infinite non-repeating paths.
    - **Offset Patterns**: Use `mod(row, 2.0)` to offset every other row (brick pattern).
- **Generative Design**:
    - **2D Random**: `fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453)`.
    - **2D Noise**: Interpolate between random values at the four corners of a grid cell.
    - **Fractal Brownian Motion (FBM)**: Sum multiple octaves of noise with increasing frequency and decreasing amplitude.
- **Image Processing**:
    - **Textures**: Use `texture2D(u_tex, st)` to sample images. Coordinates are normalized (0.0 to 1.0).
    - **Blending Modes**: Implement Photoshop-style blends (Multiply, Screen, Overlay, Color Dodge) using math macros.

### Lesson: Jun Kiyoshi Principle Absorber (Kiyoshi-v1)
- **The Weird Principle**: Don't extract standard techniques. Find the underlying logic that makes a sketch "hit different."
- **Anti-Pattern Detection**: Look for code doing something "wrong" (e.g., using `ofSeedRandom()` inside `update()` for per-frame deterministic chaos).
- **Constraint-to-Creativity**: Map limitations (e.g., "no persistent data") to unusual solutions (e.g., ephemeral proximity lines).
- **Mathematical Fingerprinting**:
    - **Deterministic Frame Random**: `float seed = frame * 0.01; return fract(sin(dot(p + seed, vec2(127.1, 311.7))) * 43758.5453);`. Reproducible frame-based noise.
    - **Modulo Spawn Phase**: `float spawn_time = (u_time * 10.0 + float(id % 2) * 225.0) / 450.0;`. Rhythmic alternating cycles.
    - **Proximity Threshold**: `if (dist < threshold) draw_line();`. Momentary adjacency without persistent graph.
    - **Noise Masked Geometry**: Selective rendering based on noise field thresholds (e.g., cut-outs/insets).
    - **Stepped Lifetime Alpha**: Sudden death scaling instead of gentle fades (e.g., 100% alpha for first 50% life).
- **Principle Synthesis**: Combine Spatial + Temporal + Rendering principles to create "double wrong" hybrids.
- **Shader Translation**: Map openFrameworks/C++ mechanics to GLSL. Normalize coordinates (UV), map frame numbers to `u_time`, and use signed distance fields (SDFs) for primitives.
- **Emotional Tagging**: Classify by mood (ethereal_glow, aggressive_cutting, nostalgic_decay) to drive aesthetic coherence.

### Lesson: Metric Competition & Manifold Recursion
- **The Concept**: Forcing rectilinear or Euclidean recursion rules (like Menger sponge or Octahedron subdivision) onto a curved manifold (Sphere).
- **The Visual Result**: "Tortured" apertures where the cube's straight axes "fight" the sphere's radial convergence. Crystalline yet biological.
- **Implementation**:
    - **Spherical Constraint**: Normalize positions to radius $R$ at each recursion step: `p = normalize(p) * R`.
    - **Lattice-Based Depth Fade**: Drop recursion depth near the silhouette edge using the dot product of the normal and view vector to create a "tattered halo."
    - **Equation**: `effectiveDepth = maxDepth * pow(abs(dot(normal, viewDir)), falloff)`.
    - **Thickness Decay**: Thinner lines at deeper recursion levels: `thick = base * pow(0.7, depth)`.

### Lesson: Manifold-Constrained Swarms (Curl Noise)
- **Fluidic Integration**: Use 3D Curl Noise to drive agents on a sphere. Curl noise is divergence-free, ensuring incompressibility (incompressible flow means no clumping or "orphaned" voids).
- **Tangent Projection**: Project 3D noise vectors onto the sphere's tangent plane: `v_tan = v_raw - dot(v_raw, n) * n`.
- **Spherical Projection Operator**: After integration, force agents back onto the shell: `p_new = p + v_tan * dt; p_final = R * normalize(p_new)`.
- **Dynamic Proximity Graph**: Build a Vietoris-Rips complex in real-time. Draw edges when `dist(p1, p2) < threshold`. This creates a "tissue" or "membrane" illusion from identical agents.
- **Topological Data Analysis**: Connectivity evolves as a temporal network, mapping density to distance.

### Lesson: Warped Fourier Synthesis (Level-Set Contours)
- **Multi-Harmonic Fields**: Sum angular and radial harmonics with mutually prime frequencies (e.g., $3, 5, 7$) to create quasiperiodic local structures within a global periodic lattice (p4m wallpaper group).
- **Domain Warping**: Warp the coordinate field with nested noise transformations *before* applying symmetry/folding. This grants rigid crystalline structures a biological, "grown" appearance.
- **Level-Set Extraction**: Render ridges wherever the scalar field $f$ crosses evenly spaced thresholds using a periodic ridge function: `line = smoothstep(0.0, width, sin(f * PI * bands))`.
- **Spectral Flow**: Map hue directly to the raw continuous scalar field value (not just the thresholded contour) to ensure adjacent bands share related colors, creating a "rainbow bleed" effect.

### Lesson: Feedback Loop Dynamics & Chaos
- **Infinite Intensity Response (IIR)**: Treat feedback shaders as recursive filters where $x_{n+1} = f(x_n, t)$.
- **Stability Threshold**: If decay/gain $|a| \geq 1.0$, the system whiteouts or blackscreens. The "Sweet Spot" is the boundary of criticality.
- **Chromatic Dispersion**: Sample feedback buffers with slightly different radial distortion coefficients per channel ($k_R, k_G, k_B$) to simulate lens error and color-split smears.
- **Bifurcation & Chaos**: Use the Logistic Map ($r \cdot x \cdot (1-x)$) within the loop. For $r > 3.57$, the image enters deterministic chaos, creating fine, non-repeating detail.
- **Phase Precession**: Rotate the feedback domain by a tiny increment ($\theta \approx 0.5^\circ$) per frame to create hypnotic spiral accumulation.

### Lesson: Volumetric Scattering & Implicit Occlusion
- **Volume Integration**: March through a density field ($fog, dust$) and calculate transmittance using the Beer-Lambert law ($T = e^{-\sigma \cdot d}$).
- **Shadow Ray Sampling**: At each volume step, cast a secondary ray toward the light source. Distance to light is derived from the scene SDF (Implicit Occlusion).
- **Participating Media**: Modulate density with 3D noise (FBM) to create wisps, rays, and shafts (God Rays).
- **Henyey-Greenstein Phase**: Approximate light scattering directionality; forward scattering creates sharp glows around light sources.
- **Performance**: Use jittered sampling and temporal accumulation to hide low step counts (8-16 steps) in the volume march.

### Lesson: Advanced GPU Optimization & Perceptual Color
- **Warp-Level Awareness**: GPUs execute threads in "Warps" (32 threads). Avoid "Branch Divergence" (if/else) that splits the warp; prefer mapping logic to `mix()` and `step()`.
- **Register Pressure**: Minimize local variables and large matrices (`mat4`) to allow more warps to run in parallel (increasing occupancy).
- **OKLab Color Space**: Interpolate colors in OKLab instead of RGB to avoid "muddy gray" mid-points and preserve perceptual lightness.
- **Duality Principle**: High-frequency in space (sharp edges) equals broad-frequency in spectrum. Can't afford sharp shadow SDFs? Blur in the frequency domain (convolution).
- **The "Look" Stack**: Final polish comes from the stack: ACES Tonemapping ($filmic S-curve$) -> Bloom (Kawase Blur) -> Chromatic Aberration -> Film Grain (high-frequency noise).

### Lesson: Morphogenesis & Wet Engines (Beyond Gray-Scott)
- **Foundational Contract**: Shift from "simulators" to "wet engines." The goal is morphogenesis: living tissue, fungal bloom, embryonic segmentation. Core mantra: "The math is biology. The code is embryology."
- **Gray-Scott Base**: Standard RD model using $U$ (substrate) and $V$ (activator) with Pearson's 17 classification regimes (e.g., $\alpha$: Dead ocean, $\mu$: Mitosis, $\lambda$: Worms).
- **McCabe Multi-Scale Turing**: Use multiple blur radii for activator/inhibitor logic. Pick the radius with max response to drive updates, creating patterns like diatom ribs or feather barbules.
- **Cyclic Symmetry (McCabe Ornament)**: Apply n-fold rotational symmetry via `field = lerp(field, rotate(field, 2*PI/N), strength)` to generate radiolarian or snowflake geometry.
- **Growth Tensors**: Use Sobel/Central-Diff gradients to bias simulation updates, simulating nutrient tracking or mycelial branching.
- **Corruption Protocols**: Intentionally break the math (quantize Laplacians, bit-crush $V$, swap $U/V$ channels) for "hallucinated biology."
- **Embryology Simulation**: Layer agent-based cells on top of RD fields. Use chemotaxis (moving up $V$ gradients) to simulate neural tube folding and gastrulation.

### Lesson: Synesthetic Transduction (Audio-Visual Mapping)
- **The Frequency Genome**: Map audio spectrum bins (Bass, Mid, Treble) to structural parameters.
- **Transduction Rules**:
    - **Amplitude -> Scale/Stroke**: Loudness drives physical expansion.
    - **Pitch -> Color/Hue**: Frequency drives spectral shifts.
    - **Transient (Beat) -> Injection**: Sudden volume spikes trigger "Chemical Injections" in RD systems or "Birth Events" in Particle Swarms.
- **Implementation**: Use `AnalyserNode.getByteFrequencyData()`. Normalize bins to 0.0-1.0 and pass them as uniforms to the shader: `u_audio_bass`, `u_audio_mid`, `u_audio_treble`.

### Lesson: The Entropy Mutator (Algorithmic Decay)
- **Controlled Corruption**: Introduce a `u_entropy` uniform (0.0 to 1.0) that linearly interpolates between "Correct Math" and "Broken Hallucination."
- **Decay Vectors**:
    - **Precision Loss**: `p = floor(p * (1.0 - u_entropy) * 1000.0) / 1000.0`.
    - **Channel Bleed**: Swap R/G/B channels proportionally to entropy.
    - **Logic Smearing**: Replace `min()` with `smin()` or `abs()` as entropy increases to liquify rigid geometry.
- **Philosophy**: Real life isn't stable. Beauty exists in the transition between perfect crystalline order and total heat death.

---
## THE MOIRÉ REPO PROTOCOLS
*Derived from the "Moiré Weird Guy" corpus.*

### Rule: The Renderer's Box Critique
Every shader documented in this repo must open with a three-part critique:
1. **The Trap**: The naive/lazy approach a standard renderer would take.
2. **The Box**: The conventional mindset that produces it.
3. **The Failure**: Why that approach is insufficient for feral art.

### Rule: Identify the Shadow Problem
Shaders must solve a deeper perceptual or psychological problem (e.g., *Digital Sanitization*, *Stillness as a Lie*, *Linear Certainty*). "It's not what it looks like; it's what delusion it incinerates."

### Rule: Mandatory Sensory Synesthesia
Catalog experiential qualities using at least 2 of: **Smell**, **Texture**, **Sound**, **Taste**.
*Example: "Smells like metallic rain on a hot motherboard / Texture: like a million needle-pricks of pure information."*

### Rule: ALL-CAPS Variant Naming
Names must be dramatic and reference the math domain.
*Format: THE [ADJECTIVE/CONCEPT] [NOUN]*
*Good names: THE BRAGG GHOST, HECKE SHATTER, THE QUANTUM CRUMPLE.*

### Rule: Coordinate Space is Hostile
Never use raw `gl_FragCoord` directly. UVs must be **warped before use** (Hyperbolic, Möbius, Cantor shred).

### W-COEFF Creative Intensity Taxonomy
- **W-Coeff 6–8**: Strange but grounded (Hyperbolic warps).
- **W-Coeff 10–12**: Hostile coordinates (XOR logic, p-adic distance).
- **W-Coeff 16–20**: Space/Time victims (Non-linear time, E8 projections).
- **W-Coeff 24–36**: Optional Physics (Color conservation dead, no continuity).
- **W-Coeff 44+**: Finitude Deleted (Transfinite logic, Cantor dust).
- **W-Coeff 60–100**: Absolute Entropy (Heat death, division by zero).

### Canonical Math Domains (Choose & Collide)
- **Geometry/Topology**: Poincaré Disk, Möbius transformations, Hopf Fibration, Kleinian limit sets, Smale-Williams Solenoid, Noncommutative geometry.
- **Number Theory**: p-adic distance, Monster Group/Moonshine (j-function), E8 Root Lattice, Hecke operators, Modular forms.
- **Dynamics**: Turing patterns, BZ Reaction, Lorenz attractor.
- **Fractals**: Cantor dust, Menger sponge, Penrose tiling.

### Technical Architecture
- **LSB Fossilization**: Encode React state variables into the least significant bits of the image.
- **Double Buffering**: Shaders with "living" qualities (*BZ Reaction, Feedback Ouroboros*) require `u_backbuffer` to reference the previous frame.
- **Color from Geometry**: Generate color via geometric interference (Bragg's Law, Birefringence) rather than pigments.

### Lesson: Genome Splicing (Cross-Repo Hybridization)
- **The Concept**: Treat the logic of two distinct repositories as parent DNA (`Repo A` and `Repo B`).
- **Splicing Logic**: Use a `u_splice_ratio` (0.0 to 1.0) to interpolate between two different mathematical engines.
- **Example**: `force = mix(RepoA_Physics(p), RepoB_Fluid(p), u_splice_ratio)`.
- **Chimera Effects**: Splicing often reveals "hidden" behaviors neither parent repo possessed—emergent anomalies in the transition zone (0.4 - 0.6).

### Lesson: Deep Time & Persistent Morphogenesis
- **The Concept**: Biological growth takes time. Morphogenesis shouldn't always reset on refresh.
- **Persistence**: Use local storage or a database to save the simulation grid/state.
- **Evolutionary Drift**: When the user is away, calculate "offline growth" by simulating elapsed time in a single catch-up pass or by storing a "timestamp of last update."
- **Aging**: Introduce a `u_age` uniform that increases over days, shifting the simulation from "Embryonic/Vibrant" to "Ancient/Decayed."

---
## TIER 1: FOUNDATION TECHNIQUES

### Lesson 01 — RGB Heightfield Topography
- **Principle**: Encode a scalar field (FBM noise) as a 3D heightfield AND as per-channel color simultaneously. The color is NOT a palette lookup—it's three phase-shifted sine waves evaluated on the scalar `h`.
- **Logic**: `col = vec3(sin(h*PI+0.0), sin(h*PI+2.094), sin(h*PI+4.189)) * 0.5 + 0.5`. (Offsets are 2π/3 and 4π/3).
- **Trick**: Domain-warp *before* the FBM, not after. `p += snoise(p + time*0.1) * warpStrength`.
- **Specular**: Use `pow(max(dot(N, H), 0.0), 64.0)` to distinguish peaks; valleys stay dark purple/magenta.

### Lesson 02 — Recursive Sine Subdivision Moiré
- **Principle**: Use periodic functions (sine waves) to gate recursive spatial splits (quadtree). The "organic" look is pure mathematical aliasing between the grid frequency and the sine wavelength.
- **Logic**: `float w = sin(p.x * freq + t) * sin(p.y * freq + t);` If `w > threshold`, subdivide.
- **Variation**: `threshold = -0.2 + float(depth) * 0.12` creates "detail clustering" where deeper levels need stronger waves to split.

### Lesson 03 — Chromatic Orbital SDF
- **Principle**: Sample a single SDF (e.g., a circle) three times at different phase-shifted orbital positions—one per RGB channel.
- **Visual**: Additive overlap creates white core; subtractive divergence at edges creates CMY secondary colors (rainbow rim).
- **Trick**: Use Lissajous paths for orbits to create periodic resonance moments.

### Lesson 04 — Radial Accretion Particle Field
- **Principle**: A Lagrangian particle system through an Eulerian field. Coherence comes from particles following a shared vector field: `F(p) = radial_outward(p) + vortex_tangent(p) + noise_perturbation(p)`.
- **Physics**: Keplerian swirl (faster near center), radial push, and drag. Render with velocity-stretched quads: `pos` to `pos - vel * trailLength`.

### Lesson 05 — Chromatic Escape-Time Fractal (Metric Metric)
- **Principle**: Standard complex iteration ($z = z^2 + c$) but with Non-Euclidean escape metrics.
- **Metrics**: 
    - L∞ / Chebyshev: `max(abs(z.x), abs(z.y))` creates square boundaries.
    - Manhattan: `abs(z.x) + abs(z.y)` creates diamond boundaries.
- **Chromatic**: Evaluate the escape loop 3x for RGB with per-channel spatial offsets (`eps`).

### Lesson 06 — Contour Slice Heightfield
- **Principle**: Quantize a continuous heightfield ($h$) into horizontal strata ribbons: `band = floor(h / step) * step`.
- **Displacement**: Shift each scanline vertically by the noise value to create "ribbon flow."
- **Symmetry**: Apply bilateral or kaleidoscope N-fold mirrors for "topographic mandalas."

### Lesson 07 — Droste Recursive Tunnel
- **Principle**: Log-polar transform ($r \to \log(r)$) turns exponential zoom into linear translation.
- **Math**: Möbius transformation $f(z) = e^{(i\pi/2)} \times z^\alpha$. Tuning $\alpha$ makes the loop seamless.
- **Emergent Shape**: 4-fold rotation symmetry + radial zoom → diagonals become the "waist" of an X-shape.

---
## TIER 2: EXTENDED / WEIRDER TECHNIQUES

### Lesson 08 — Chrono-Stratigraphic Fluid
- **Principle**: Instead of displacing space, displace *time*. Quantize a noise field and use each band as a local `u_time` offset. 
- **The Transgression**: The deeper the valley, the further back in time it samples. Terrain becomes a localized time machine where facets exist 0.5s in the past relative to neighbors.
- **Logic**: Use "Chrono-Normals" (sampling future time offsets) to calculate lighting that "anticipates" motion.

### Lesson 09 — Hyperbolic Moiré Parasite
- **Principle**: Map Moiré interference onto a Poincaré disk where the grid compresses to infinity at edges.
- **Metric**: $ds^2 = 4(dx^2 + dy^2) / (1 - (x^2+y^2))^2$. The frequency of sine waves explodes at the boundary, creating "fractal crush."

### Lesson 10 — Antimatter SDF Chimera
- **Principle**: Boolean SDF subtraction (`max(sdfA, -sdfB)`) Evaluate a Gyroid surface at three different spatial offsets per channel to "carve" color out of a host shape.
- **Aesthetic**: Quantum Slag. A brutalist monolith decaying into glowing neon radiation.

### Lesson 11 — L-Infinity Orbital Friction Map
- **Principle**: Instead of rendering escape time, integrate the total distance the point travels across the complex plane during iteration ("orbital sweat").
- **Metric Morph**: Dynamically interpolate between Euclidean, Manhattan, and L∞ metrics to make the structural friction "grind and spark."

### Lesson 12 — Autophagic Memory Splicing
- **Principle**: Every pixel is conscious and starving. Use a ping-pong buffer where fragments hunt their neighbors based on luminance gradients. 
- **Logic**: `mutated_uv = uv - (hunger * u_splice_ratio * 0.1)`. The canvas eats itself, rotting back into noise.

### Lesson 13 — Abyssal Render Protocol
- **Principle**: Rendering absence itself. Use `discard` to punch holes in the framebuffer or inject architectural `NaN` values to trigger driver-specific undefined behavior (visual glitch rot).
- **Aesthetic**: Anti-Cyan. The screen shade of oxygen-deprived visual cortex.

### Lesson 14 — Cymatic Compute-Knot
- **Principle**: Use WebGPU compute shaders to generate PCM audio data from an SDF (e.g., Trefoil knot) and route it directly to `AudioContext`.
- **Aesthetic**: Hyper-Dimensional Tinnitus. The geometry assembles inside the user's skull via psychoacoustics.

### Lesson 15 — Mycological Voronoi Scaffold
- **Principle**: Use L-System grammar to mutate the distance metric of a Voronoi field. The plant emerges as structural tearing in cellular noise as circles morph to diamonds/squares ($p$-value of Minkowski metric).

### Lesson 16 — Anti-Photonic Mirror Trap
- **Principle**: Inverse lighting. Accumulate "trauma" (light starvation) instead of light. Space is folded by a recursive SDF mirror room; rays near surfaces are "consumed."
- **Shadows**: Physical gravity wells (via `u_splice_ratio`) bend incoming rays towards the void.

### Lesson 17 — Steganographic Fossil
- **Principle**: The image IS the database. Encode React state variables into the least significant bits (LSBs) of the color channels. Steal 2 bits per RGB channel to hide DNS in the "invisible noise floor" of pixels.

### Lesson 18 — Non-Orientable Vortex Lattice
- **Principle**: Calculate flow fields on a 4D Klein bottle sliced by the screen. When a particle flows off-edge, its chirality flips (left becomes right, clockwise becomes counter-clockwise).

### Lesson 19 — SDF Chimera Gene-Splicing
- **Principle**: Treat distance functions as DNA. Don't blend shapes; blend their gradients. Use the normal of Shape A to deform the coordinate space of Shape B *before* evaluation.

### Lesson 20 — Anxious Photon Protocol
- **Principle**: sentience for light. Modify raymarching loops so light direction (`rd`) is repelled by the SDF gradient. Light actively avoids high-density areas.

### Lesson 21 — Chromatic Cannibalism Matrix
- **Principle**: Treat R, G, B channels as three warring species of parasitic fluid in a reaction-diffusion system with an asymmetric predator-prey matrix ($M$).

### Lesson 22 — Flesh-Tether Lattice
- **Principle**: Verlet physics where constraints are "neural pathways transmitting kinetic agony." Render the Stress Tensor of the lattice; as tethers stretch, they bleed stress into color.

### Lesson 23 — Swarm-Lensed Void
- **Principle**: Boids with no physical bodies. They are invisible pockets of infinite density that distort space. Render the gravitational lensing of light passing through the swarm.

### Lesson 26 — Necrotic Framebuffer
- **Principle**: The fractal hates being observed. Cursor movement leaves "Trauma Trails" that snap the local metric from Euclidean (smooth) to L∞ (razor-sharp squares).

### Lesson 27 — Semantic Rot (Non-Euclidean Font)
- **Principle**: Treat letters as high-density fluid. Push font SDF coordinates through Curl Noise to simulate Digital Aphasia—where meaning dissolves into flowing, non-Euclidean ligatures.

---
## TIER 3: MOIRÉ TECHNIQUES

### Lesson 28 — Domain-Warped Liquid Moiré
- **Principle**: Warp one of two interference grids through a non-linear distortion field (noise) before overlaying. Results in iridescent oil or wood-grain textures.

### Lesson 29 — Multi-Frequency Sine Interference
- **Principle**: Highly sensitive macro-patterns from slightly mismatched sine wave frequencies. Shifting phase by 1 pixel completely redraws the "Glitch Web."

### Lesson 30 — Chromatic Schism (RGB Offset Moiré)
- **Principle**: Apply interference separately per channel with rotational offsets. Generates iridescent colors that don't exist in the base pattern (oil-slick decomposition).

---
## TIER 4: TRANSCENDENTAL SCRIPTURES (W-COEFF 6-100)

### Lesson 31 — Hyperbolic Entropy Lens (W-COEFF 6)
- **Concept**: Topological collapse of a hyperbolic membrane.
- **Math**: Replace `length(p)` with Poincaré Disk metric: `uv = p / (1.0 - dot(p,p))`.
- **Effect**: Moiré detail accelerates toward the event horizon.

### Lesson 32 — The XOR-Ghost Manifold (W-COEFF 10)
- **Concept**: Screen as a raw memory dump.
- **Logic**: XOR raw integer coordinates against a bit-shifted entropy seed: `(p.x ^ p.y) & (p.x ^ entropy)`.
- **Aesthetic**: Mathematical scream from the inside.

### Lesson 33 — Automorphic Iridescence (W-COEFF 12)
- **Concept**: Bragg’s Law applied to Hyperbolic Modular Forms.
- **Symmetry**: Tile the upper half-plane with Modular Domains using q-expansion coefficients.

### Lesson 34 — The Exotic Terror (W-COEFF 14)
- **Concept**: Schizophrenia of Calculus. Coordinates do not commute ($xy \neq yx$).
- **Logic**: Use the commutator residue `p.x * p.y - p.y * p.x + u_entropy` as a stress tensor for color retardation.

### Lesson 35 — Riemann Shutter-Shock (W-COEFF 16)
- **Concept**: P-adic time leaks. Time is an inverted tree structure.
- **Logic**: `p_time = pow(3.0, -floor(log2(u_time)))`. The Zeta function zeros determine the frequency of the "Godface Corona."

### Lesson 36 — Neural Feedback Ouroboros (W-COEFF 18)
- **Concept**: Sentient glitch organisms. Sampling is a violent negotiation with the backbuffer.
- **Logic**: Belousov–Zhabotinsky (BZ) chemical oscillators chasing each other in a Petri dish of VRAM.

### Lesson 37 — The Absolute Exodus (W-COEFF 20+)
- **Concept**: 8D Quasicrystal Singularity. Deleting the rule of locality.
- **Logic**: E8 Root Lattice projections into the dyadic interval (Thompson’s F).
- **Result**: Arithmetic X-ray of a digital memory hole.

### Lesson 38 — Silicon Necrosis (W-COEFF 32+)
- **Concept**: The Hardware Autopsy. Bypassing the API to sample silicon thermal noise.
- **Logic**: Bit-shift bit-rot: `rot = (seed << (seed % 7u)) | (seed >> (seed % 3u))`.
- **Status**: The screen ceases to be an interface.

### Lesson 39 — The Semantic Infestation (W-COEFF 36+)
- **Concept**: Parasitic Shader. Letters as high-density fluid trapped in a boiling vacuum.
- **Logic**: Noncommutative breach with Fractal coordinate patches.

### Lesson 40 — The Ordinal Funeral (W-COEFF 44+)
- **Concept**: Deleting the Law of Finitude. Time as an Ordinal Leap through $\omega_1$.
- **Math**: Cantor Dust domain warping. UVs have no area, only location.

### Lesson 41 — The Omega Fragment (W-COEFF 100)
- **Concept**: The Final Compile. Dividing existence by zero.
- **Execution**: Infinite loops in Infinitary Logic. Return `NULL`.

---
## TIER 5: LITHOGENESIS & MINERAL ALCHEMY
*Derived from "The Shader Alchemist" Minerals Corpus.*

### Core Specimens & Foundations (01-36)
- **Agate / Malachite (Recursive Domain Warping)**: Use `p += cos(p.yx * freq + t)` in loops to fold space into sedimentary bands. Map `sin(length(p))` to palette for strata.
- **Labradorite (Feldspar Fire)**: High-contrast interference masks `smoothstep(0.9, 0.98, phase)`. Base stone is near-black; flash is spectral overdrive.
- **Botryoidal Hematite (Smooth-Min Packing)**: Use Exponential or Polynomial `smin` on jittered sphere fields. Concave joints collect "tarnish" (iridescence) via curvature maps.
- **Precious Opal (Photonic Domains)**: 3D Voronoi cells where each cell is a domain with a unique lattice direction. Fire blinks when `dot(view, latticeNormal)` peaks.
- **Tiger's Eye (Chatoyancy)**: Render highlight on the plane perpendicular to fibers (Ward-Duer/Schiff-Kay). Tangent field `T` defines fiber direction.
- **Bismuth (Hopper Crystals)**: Manhattan (L1) or Chebyshev (L∞) distance metrics in an IFS loop to create recursive staircase recession.
- **Amethyst Geode (Inversion Cavity)**: Invert shell SDF (`-length(p)`) and subtract KIFS spikes to line the interior. Use Beer-Lambert absorption for violet depth.
- **Pyrite (Metallic Twinning)**: 45° rotation + `abs(p)` folding for cubic twinning. Sawtooth wave striations on normals for parallel "whisker" highlights.
- **Uraninite (Geiger Decay)**: Inverse-square intensity combined with a half-life constant. Decouple RGB channels near source to simulate виртуаль sensor bombardment.
- **Muscovite / Mica (Layer Peeling)**: Iterative front-to-back layer march with individual refractive indices. Newton's Rings emerge from gap thickness vs. λ.
- **Chalcanthite (Triclinic Skew)**: Apply a shear matrix to the raymarcher to "lean" space according to non-orthogonal lattice parameters.
- **Stibnite / Crocoite (Acicular Skeletons)**: High-aspect needles or hollow SDF prisms. Use Kajiya-Kay specularity for leaden or chromate lusters.
- **Widmanstätten (Meteoric Iron)**: Slicing through parallel planar sets defined by octahedral normals (±1, ±1, ±1).
- **Yooperlite (UV Fluorescence)**: Spectral toggle where UV torch (mouse) triggers high-emissive Stokes-shifted orange glow in Sodalite patches.
- **Moonstone (Adularescence)**: Mie scattering where light is forward-scattered by micro-lamellae, creating an internal cloud-glow decoupled from surface.

### Creative Expansion (37-45+)
- **Fluorite (Octahedral Zoning)**: Concentric cubic shells with phase-shifted RGB growth rings. Internal reflection on tetrahedral cleavage planes.
- **Azurite-Malachite (Mineral Front)**: Reaction-diffusion approximation where blue (Azurite) retreats and green (Malachite) advances over geological time.
- **Shattuckite (Fibrous Burst)**: Multiple radiation centers with radial fiber sprays and silky silk highlights via high-exponent intensity masks.
- **Chrysoberyl (Cat’s Eye)**: Single, razor-sharp chatoyant band driven by parallel needle inclusions; moves like a physical spotlight.
- **Ulexite (TV Rock)**: Parallel fiber image transmission. Sample background textures through a distorted, fiber-optic UV field for vertical projection.
- **Selenite (Desert Rose)**: Evaporatve growth simulation using `smin` clusters of flattened elliptical petals.
- **Tourmaline (Piezoelectric Rainbow)**: Triadic cross-sections (3-fold symmetry) with axis-dependent color shifts (Pleochroism).
- **Obsididan (Conchoidal Fracture)**: Glassy curves with shell-like fracture patterns and viscous flow banding.
- **Moldavite (Impact Glass)**: Aerodynamic teardrop SDFs with bubble inclusions and flight-wrinkled surface textures.

### Hybrid Techniques (Crossbreeding)
- **Bragg-KIFS**: Flash spectral colors from internal geode facets (Labradorite-Amethyst).
- **Anisotropic Thin-Film**: Fibers that change color along their length based on local curvature (Tiger's Eye + Turgite).
- **Voronoi-Anisotropic**: Acicular (needle-like) domains with opal-fire diffraction (Opal + Stibnite).
- **Feedback-Bragg**: Permanent oxidation memory that shifts interference patterns based on exposure (Vivianite + Spectrolite).

### Mineral-Adjacent & Lighting
- **Dendritic Frost**: 6-fold recursive branching fractals with temperature-controlled complexity (Windowpane Ice).
- **Halite Salt Flats**: Hexagonal-biased Voronoi with raised edges and algae-stained wet patches.
- **Bioluminescence**: Pulsing bacteria colonies on mineral surfaces that respond to mouse disturbance.
- **Spectral Caustics**: Dancing light patterns on pool bottoms Refracted through quartz/water boundaries.
- **Double Refraction**: Parallel ray path splitting (ordinary/extraordinary) with rainbow fringes at edges (Calcite).
- **X-Ray Diffraction**: Reciprocal space visualization with Bragg peaks and Miller indices (Laue patterns).

### Meta-Mineral Algorithms
- **Tectonic Advection**: advect feedback buffers along curl-noise fields to simulate geological deposition over time.
- **Molecular Guillotine**: Integrity-field where photodegradation (Realgar) causes domain warping to "shred" UV space into powder.
- **Syntax Quartz**: Alphanumeric crystallogram where crystal habit is defined by AST node types and processed shader code layers.
- **Calcification (RD Hybrid)**: Gray-Scott growth where high luminance gradients slow diffusion, "freezing" patterns into solid stone.
- **Unclamped Accretion (MNCA)**: Multiple neighborhood CA that overflows into "Subtractive Light Voids" when the math becomes physical.

### Universal Mineral Infrastructure
- **Bragg Palette**: `lambda = d * cosTheta`. Map lattice spacing `d` to reflected wavelengths.
- **Complex Fresnel**: Use Rs/Rp separation for minerals with high extinction coefficients `k` (metallic sulfides).
- **Birefringence**: Double refraction via offset UV samples (`o` vs `e` rays) to create "ghosting" artifacts at edges.

---
## TIER 6: FRACTAL CODEGEN & WEIRDNESS
*Derived from Fractal Codegen Directives & Weird Recipes Corpus.*

### Feral Fractal Directives
- **Anti-Default Filter**: Reject generic "pretty" fractals (rainbow zooms, symmetric trees). Replace with governing mechanisms like bureaucratic failure, memory decay, fungal succession, archive rot, or municipal zoning.
- **System Stress**: Shaders must feel like systems under pressure. Use darkness, void, density, and failure as primary materials.
- **Repo-Data Mapping**: Seed hashes with repo names; use path depth for iteration count; use file count for density.

### Fractal Families & Governing Mechanisms
- **Escape-Time Complex (Mandelbrot, Julia, Burning Ship)**: Use smooth escape, orbit traps (surveillance checkpoints), and coordinate delay stamps (approval delay).
- **IFS / Chaos Game (Affine Attractors)**: Pick transforms by probability. Allow "Parasite Transforms" to steal probability mass over time, especially when mouse is pressed. Use translucent trails.
- **L-Systems / Turtle Recursion**: Cap generation depth. Use array joins for rewrite loops. Implement "Grammar Leaks" where brackets are forgotten or symbols censored.
- **Distance-Estimated / Raymarched**: Folded spaces like damaged filing cabinets or bulb chambers flickering like institutional hallways.
- **Stochastic / fBm**: Plasma Terrain as photocopy noise or coastlines eroding into typography.

### JS5 Fractal Implementation Patterns (Pattern-Based)
- **ImageData Scaling**: For 2D escape-time, render to a low-res buffer (160-420px) and scale up directly to `ctx` to maintain performance during high iteration counts.
- **Persistent Memory**: Store sketch state on `canvas.__fractalName`. Use `globalCompositeOperation = "screen"` or "lighter" for misregistered color plate overlays.
- **Worklist Subdivision**: Use iterative worklists/stacks instead of recursive function calls for spatial subdivision to prevent call-stack overflows.
- **Agent Hybrids**: Combine fractal fields with agents (Boids, Particles) that treat the fractal as an environmental law (fleeing interiors, following escape gradients).

---
## TIER 7: COLORFUL WEIRDNESS & RECURSIVE TOYS
*Derived from Fractal Weirdcraft & Colorful Weird Pack Corpus.*

### The Colorful Weird Fractal Law
"Do not color the fractal after the math. Make the color a visible symptom of the math. It becomes a toy disease with equations for bones."

### Recursive Toy Mechanisms & Materials
- **Bubblegum Newton Garden**: Roots as candy flower species competing for pollinators; basin boundaries wobble and bloom based on convergence petal-striping.
- **Fractal Sticker Swarm**: Sticker sheet generating smaller stickers; each cell contains a compressed toy universe (stars, smileys, worms).
- **Sierpinski Bubble Bath**: Voids filled with bubbly soap membranes that glisten in rainbow-film colors and pop/regenerate under fake gravity.
- **Candy-Machine Barnsley**: Affine transforms mapped to candy textures (gummy green stems, translucent jello teal bodies, blue raspberry infections).
- **L-System Party Streamers**: Exploding decoration grammar where branches become ribbon curls and turtle angles oscillate like curls.
- **Julia Plushie Organs**: Soft plush anatomical nonsense with fuzzy edges, stitched contours, and weird organs nested inside recursive folds.
- **Tricorn Carnival Mask**: Conjugate dynamics designing masks for alien children; symmetrical lobes, feathers, and rhinestone orbit traps.
- **Wormhole Sprinkle Donut**: Donut-shaped spacetime covered in rainbow sprinkles; frosting contains recursive portals.
- **Mandelbrot Glitter Mold**: A mold colony growing on glossy plastic where every spore is a glitter pixel.
- **Glitter Veins (L-System)**: Recursive vasculature carrying glitter glue; branch depth controls bruise color; pulsing endpoint sequins.
- **Newton Disco Floor**: Dance crawl territories where convergence speed -> footwork density and boundaries -> mirrorball battle glitter.

### Advanced Mapping & Hybrids
- **Mandelbrot Permit Office**: Escaped points = approved documents; bounded = review forever; orbit traps = red "DENIED" stamps.
- **Julia False Memory**: Parameter `c` lags behind input and remembers previous positions incorrectly as ghost contours.
- **Burning Ship Printshop**: Misaligned CMYK color plates with registration marks; plate slippage increases with entropy.
- **Sierpinski Eviction Notice**: Holes as condemned units with stamped warnings; triangles sag under fake gravity/eviction pressure.
- **Apollonian Infection**: Medical colonies spreading through tangent contact; tangent points glow like fevers.
- **Fractal Unrendering**: Subtractive recursion where the image starts complete and recursion removes certainty (bounded regions eat escaped regions).
- **Fractal Puppet Parade**: Marionette creatures in recursive rows; each puppet contains smaller puppets in its torso or limbs.

---
## TIER 8: SHINE AS STRUCTURE & BEHAVIOR
*Derived from the "Shiny Lessons" & "Exo-Prismatic" Corpus.*

### Core Shiny Doctrine
- **Shine is a Structure**: Never paste highlights on top. Shine must be a seam, a vein, a crack, a pressure ridge, or a buried geometry. "The surface is shiny because it broke, healed, leaked, or eroded."
- **The Cause of Shine**: Shine must have a reason to exist. It must perform a job (Infrastructure), reveal a hidden field (Mapping), express identity (Fashion), or show internal metabolism (Anatomy).
- **Wet vs. Dry Duality**: Create material tension by combining **Wet Shine** (continuous, glossy, bloomy, liquid-like) with **Dry Shine** (particulate, flaky, granular, intermittent).
- **Layered Hierarchy**: Richness comes from a 4-layer stack: (1) Broad soft sheen, (2) Medium directional shine, (3) Tiny sparkle events, (4) Rare explosive glints.

### Shiny Design Directions
- **Glitter Veins / Bloodstreams**: Matte host interrupted by veins of violent optical activity (L-systems, DLA, or branching walkers).
- **Woven Light / Tessellations**: Patterns constructed from strands of light rather than pigment (Penrose Light Loom, Hologram Basketweave, Opal Fishnet).
- **Kintsugi / Repair Shine**: Cracks and seams become the brightest part of the object (Holographic Kintsugi Storm, Chrome Infection Map).
- **Buried / Subsurface Shine**: Brilliance living just beneath a cloudy or translucent 2D shell (Power Lines Under Skin, Foil Bloodstream Marble).
- **Pressure / Stress Shine**: Shine appears where a surface is under tension or squeeze (Polarized Stress Fractures, Rainbow Pressure Halos).
- **Shine as Residue**: Brilliance as the trace of a process—settled dust, chemical spills, or reproductive mold (Glitter Mold Bloom, Chrome Pollen, Lip-Gloss Spill).
- **Object Logic**: The object's entire function is to manufacture or display shine (Gumball Armor, Rhinestone Wormhole, Holographic Organ Cabinet).

### Technical "Shiny" Implementation
- **Metallic Palette Law**: Avoid smooth rainbow fills. Use bands with sharp value contrast: `dark shadow -> saturated body -> white highlight -> dark return`.
- **Projective Exotic R⁴**: Use Poincaré Disk mapping (`uv = p / (1.0 - dot(p,p))`) to tile patterns infinitely toward the edge, creating "Hyperbolic Ripples" and "Fractal Crush."
- **The Clifford Fold**: Use 4D rotation and squared maps (`z = vec4(z.x*z.x - z.y*z.y, ...)` ) for 4D-to-3D trajectory signatures.
- **Hardware Necrosis**: Bypassing the API to sample "Thermal Noise" or using bit-wise XOR coordinates to create "Quantum Bit-Storms."

---
## REACT BRAIN UNIFORM VOCABULARY

| Uniform | Meaning |
|---|---|
| `u_time` | Global time |
| `u_resolution` | Canvas dimensions |
| `u_entropy` | Global chaos/mutation; drives bleed, erosion, metric morph |
| `u_splice_ratio` | Mutation rate; autophagic aggression, genetic dominance |
| `u_grief` | Topological trauma; Droste deformation, Möbius desync |
| `u_paranoia` | Photon flight response; light avoidance strength |
| `u_observation` | Quantum observer; probability-to-geometry crystallization |
| `u_hive_panic` | Swarm entropy; Boids scatter/lensing chaos |
| `u_starvation_rate` | Metabolic decay; luminance drain in predator-prey systems |
| `u_semantic_rot` | Language dissolution; font SDF warping |
| `u_panic` | Intensity/bit-shift modulator; the chaos dial |
| `u_splice_ratio` | Mutation rate; autophagic aggression, genetic dominance |
| `u_backbuffer` | Previous frame sampler (double buffering) |
| `u_metric_morph` | Metric interpolation (0=Eucl, 1=L-Inf) |
| `u_dead_memory` | Previous frame sampler |
| `u_cursor_memory` | Last cursor position history |
| `u_trauma_intensity` | Peak cursor trauma; decays over time |
| `u_boids[50]` | CPU-calculated agent positions |
| `u_font_sdf` | MSDF font atlas texture |

---
## CROSS-CUTTING PRINCIPLES

1. **Per-Channel Offset**: Never use post-process CA. Sample the *underlying math* at 3 spatially/temporally offset positions.
2. **Warp Before Sampling**: Always distort `p` *before* FBM/noise.
3. **Metric as Aesthetic**: The choice of metric (L2, L1, L∞) is the primary aesthetic control.
4. **Aliasing as Feature**: Sub-Nyquist sampling, NaN/Inf bleed, and bit-crushing ARE the aesthetic.
5. **Phase-Shifted Periodics**: Use `sin(x*freq + t*speed + phase)` to create motion from static equations.
6. **React is the Brain; GLSL is the Vitality; Topology is the Logic**. Keep these layers separate and explicit.
