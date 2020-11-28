let camera;
let scene;
let renderer;
let Jonsson_embedding;
const verticalViewAngleSlider = document.getElementById("verticalViewAngleSlider");
const horizontalViewAngleSlider = document.getElementById("horizontalViewAngleSlider");

function getFreeFallPoints(peak, planet_mass, n_pts = 100) {
    let pts = [];
    const fallTime = freeFallTime(peak.y, earth_radius, planet_mass);
    // from the left up
    for(let i=0;i<n_pts;i++) {
        const t = peak.x - fallTime + i*fallTime/n_pts;
        let h = peak.y - freeFallDistance(peak.x-t, peak.y, planet_mass);
        h = Math.max(earth_radius, h);
        pts.push(new P(t,h));
    }
    // from the top down
    for(let i=0;i<=n_pts;i++) {
        const t = peak.x + i*fallTime/n_pts;
        let h = peak.y - freeFallDistance(t - peak.x, peak.y, planet_mass);
        h = Math.max(earth_radius, h);
        pts.push(new P(t,h));
    }
    return pts;
}

function lineCurveFromPoints(pts) {
    const curvePath = new THREE.CurvePath();
    for(let i = 1; i < pts.length; i++) {
        curvePath.add(new THREE.LineCurve3(new THREE.Vector3(pts[i-1].x, pts[i-1].y, pts[i-1].z), new THREE.Vector3(pts[i].x, pts[i].y, pts[i].z)));
    }
    return curvePath;
}

function addFunnel(scene) {
    // add a narrow strip up the funnel, and make instanced copies of it rotating round
    const min_x = earth_radius;
    const max_x = earth_radius + 1000e6;
    const n_x = 2000;
    const dx = (max_x - min_x) / n_x;
    const n_t = 200;
    const dtheta = 2 * Math.PI / n_t;
    
    let spaceline_vertices = [];
    let strip_vertices = [];
    let strip_normals = [];
    let strip_faces = [];
    for(let i = 0; i < n_x; i ++) {
        const x = Jonsson_embedding.getXFromSpace(min_x + i * dx);
        let p = Jonsson_embedding.getEmbeddingPointFromXAndTheta(x, 0);
        let n = Jonsson_embedding.getSurfaceNormalFromXAndTheta(x, 0);
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

    // add major and minor axes
    const minor_axes_material = new THREE.LineBasicMaterial({ color: 'rgb(200,200,200)' });
    const major_axes_material = new THREE.LineBasicMaterial({ color: 'rgb(100,100,100)' });
    const spaceline_geometry = new THREE.BufferGeometry();
    spaceline_geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( spaceline_vertices, 3 ) );
    const major_spaceline = new THREE.Line( spaceline_geometry, major_axes_material );
    scene.add( major_spaceline );
    const n_minor_time = n_t / 10;
    for(let i = 1; i < n_minor_time; i++) {
        const minor_spaceline = new THREE.Line( spaceline_geometry, minor_axes_material );
        minor_spaceline.rotation.z = i * 2 * Math.PI / n_minor_time;
        scene.add( minor_spaceline );
    }
    const timeline_geometry = new THREE.BufferGeometry();
    timeline_geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( timelines_vertices[0], 3 ) );
    const major_timeline = new THREE.Line( timeline_geometry, major_axes_material );
    scene.add( major_timeline );
    timelines_vertices.slice(1).forEach(timeline_vertices => {
        const timeline_geometry = new THREE.BufferGeometry();
        timeline_geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( timeline_vertices, 3 ) );
        const minor_timeline = new THREE.Line( timeline_geometry, minor_axes_material );
        scene.add( minor_timeline );
    });
    
    // add text labels
    const labels = [];
    const theta_div = 2 * Math.PI / n_minor_time;
    const origin = Jonsson_embedding.getEmbeddingPointFromSpacetime(new P(0, min_x));
    origin.y -= 0.1;
    origin.z -= 0.1;
    labels.push([getTimeLabel(Jonsson_embedding.getTimeDeltaFromAngleDelta(theta_div)), rotateXY(origin, theta_div)]);
    labels.push([getTimeLabel(Jonsson_embedding.getTimeDeltaFromAngleDelta(2 * theta_div)), rotateXY(origin, 2 * theta_div)]);
    for(let x = min_x + x_step; x < min_x + 30e6; x+= x_step) {
        const label = getDistanceLabel(x - min_x);
        const p = Jonsson_embedding.getEmbeddingPointFromSpacetime(new P(0, x));
        labels.push([label, p]);
    }
    const loader = new THREE.FontLoader();
    loader.load( helvetiker_regular_typeface_json, function ( font ) {
        const material = new THREE.MeshBasicMaterial({color: 'rgb(0,0,0)'});
        labels.forEach(label => {
            const [message, p] = label;
            const shapes = font.generateShapes( message, 0.08 );
            const geometry = new THREE.ShapeBufferGeometry( shapes );
            geometry.computeBoundingBox();
            const text = new THREE.Mesh( geometry, material );
            text.rotation.y = Math.PI / 2;
            text.rotation.z = Math.PI / 2;
            text.position.x = p.x;
            text.position.y = p.y;
            text.position.z = p.z;
            scene.add( text );
        });

    } ); //end load function
}

function init() {
    const canvas = document.getElementById('my_canvas');

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 'rgb(255,255,250)' );
    
    const ambientLight = new THREE.AmbientLight( 0xcccccc, 0.4 );
    scene.add( ambientLight );

    camera = new THREE.PerspectiveCamera( 26, canvas.width / canvas.height, 0.1, 1000 );

    const pointLight = new THREE.PointLight( 0xffffff, 0.8 );
    camera.add(pointLight);
    
    scene.add(camera);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: my_canvas });
    renderer.setSize( canvas.width, canvas.height );

    Jonsson_embedding = new JonssonEmbedding();
    
    addFunnel(scene);
    
    {
        const trajectory_color = 'rgb(200,100,100)';
        const trajectory_material = new THREE.MeshStandardMaterial({ color: trajectory_color });
        
        // add a trajectory
        const peak = new P(0, earth_radius + 5e6);
        const pts = getFreeFallPoints(peak, earth_mass).map(p => Jonsson_embedding.getEmbeddingPointFromSpacetime(p));
        const curvePath = lineCurveFromPoints(pts);
        const tube_geometry = new THREE.TubeBufferGeometry( curvePath, 500, 0.01, 8, false );
        const tube = new THREE.Mesh( tube_geometry, trajectory_material );
        scene.add( tube );
        
        // add a sphere at the peak
        const peak3D = Jonsson_embedding.getEmbeddingPointFromSpacetime(peak);
        const sphere_geometry = new THREE.SphereGeometry(0.05, 32, 32);
        sphere_geometry.translate(peak3D.x, peak3D.y, peak3D.z);
        const sphere = new THREE.Mesh( sphere_geometry, trajectory_material );
        scene.add( sphere );
    }
}

function animate() {
    requestAnimationFrame( animate );
    const d = 10;
    const z = 1.7;
    const theta = - Math.PI / 2 + 2 * Math.PI * horizontalViewAngleSlider.value / 100.0;
    const phi = - Math.PI / 2 + Math.PI * verticalViewAngleSlider.value / 100.0;
    camera.position.set(d * Math.sin(theta) * Math.cos(phi), d * Math.cos(theta) * Math.cos(phi), z + d * Math.sin(phi));
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, z);
    renderer.render( scene, camera );
}

init();
animate();
