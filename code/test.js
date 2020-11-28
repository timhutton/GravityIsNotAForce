let camera;
let scene;
let renderer;
const verticalViewAngleSlider = document.getElementById("verticalViewAngleSlider");
const horizontalViewAngleSlider = document.getElementById("horizontalViewAngleSlider");

function init() {
    const canvas = document.getElementById('my_canvas');

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 'rgb(255,255,255)' );
    
    const ambientLight = new THREE.AmbientLight( 0xcccccc, 0.4 );
    scene.add( ambientLight );

    camera = new THREE.PerspectiveCamera( 75, canvas.width / canvas.height, 0.1, 1000 );

    const pointLight = new THREE.PointLight( 0xffffff, 0.8 );
    camera.add(pointLight);
    
    scene.add(camera);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: my_canvas });
    renderer.setSize( canvas.width, canvas.height );

    {
        // add a narrow strip up the funnel, and make instanced copies of it rotating round
        const Jonsson_embedding = new JonssonEmbedding();
        const min_x = earth_radius;
        const max_x = earth_radius + 100e6;
        const n_x = 200;
        const dx = (max_x - min_x) / n_x;
        const n_t = 200;
        const dtheta = 2 * Math.PI / n_t;
        
        let spaceline_vertices = [];
        let strip_vertices = [];
        let strip_normals = [];
        let strip_faces = [];
        for(let i = 0; i < n_x; i ++) {
            const x = min_x + i * dx;
            const spacetime = new P(0, x);
            let p = Jonsson_embedding.getEmbeddingPointFromSpacetime(spacetime);
            let n = Jonsson_embedding.getSurfaceNormalFromSpacetime(spacetime);
            strip_vertices.push(p.x, p.y, p.z);
            strip_normals.push(n.x, n.y, n.z);
            spaceline_vertices.push(p.x, p.y, p.z);
            p = rotateXY(p, dtheta);
            n = rotateXY(n, dtheta);
            strip_vertices.push(p.x, p.y, p.z);
            strip_normals.push(n.x, n.y, n.z);
            if(i < n_x - 1) {
                const j = 2 * i;
                strip_faces.push(j, j+1, j+2);
                strip_faces.push(j+1, j+3, j+2);
            }
        }
        
        const x_step = 5e6;
        let timelines_vertices = [];
        for(let x = min_x; x < max_x; x+= x_step) {
            let pts = []
            const spacetime = new P(0, x);
            let p = Jonsson_embedding.getEmbeddingPointFromSpacetime(spacetime);
            pts.push(p.x, p.y, p.z);
            for(let i = 0; i < n_t; i++) {
                p = rotateXY(p, dtheta);
                pts.push(p.x, p.y, p.z);
            }
            timelines_vertices.push(pts);
        }
        
        const funnel_geometry = new THREE.BufferGeometry();
        funnel_geometry.setIndex( strip_faces );
        funnel_geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( strip_vertices, 3 ) );
        funnel_geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( strip_normals, 3 ) );
                
        const funnel_material = new THREE.MeshBasicMaterial({
            color: 'rgb(250,250,250)',
            opacity: 0.85,
            transparent: true,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: 1, // positive value pushes polygon further away
            polygonOffsetUnits: 1
        });

        const funnel = new THREE.InstancedMesh(funnel_geometry, funnel_material, n_t);
        const matrix = new THREE.Matrix4();
        for(let i = 0; i < n_t; i++) {
            matrix.makeRotationZ(dtheta * i);
            funnel.setMatrixAt(i, matrix);
        }
        scene.add(funnel);

        const line_material = new THREE.LineBasicMaterial({ color: 'rgb(200,200,200)' });
        const spaceline_geometry = new THREE.BufferGeometry();
        spaceline_geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( spaceline_vertices, 3 ) );
        const n_minor_time = n_t / 10;
        for(let i = 0; i < n_minor_time; i++) {
            const line = new THREE.Line( spaceline_geometry, line_material );
            line.rotation.z = i * 2 * Math.PI / n_minor_time;
            scene.add( line );
        }
        timelines_vertices.forEach(timeline_vertices => {
            const timeline_geometry = new THREE.BufferGeometry();
            timeline_geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( timeline_vertices, 3 ) );
            const line = new THREE.Line( timeline_geometry, line_material );
            scene.add( line );
        });
    }
}

function animate() {
    requestAnimationFrame( animate );
    const d = 3;
    const theta = Math.PI - 2 * Math.PI * horizontalViewAngleSlider.value / 100.0;
    const phi = 0.9 * (- Math.PI / 2 + Math.PI * verticalViewAngleSlider.value / 100.0);
    camera.position.set(d * Math.sin(theta) * Math.cos(phi), d * Math.cos(theta) * Math.cos(phi), 1 + d * Math.sin(phi));
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 1);
    renderer.render( scene, camera );
}

init();
animate();
