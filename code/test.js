const canvas = document.getElementById('my_canvas');
const verticalViewAngleSlider = document.getElementById("verticalViewAngleSlider");
const horizontalViewAngleSlider = document.getElementById("horizontalViewAngleSlider");

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0xf0ffff );

const camera = new THREE.PerspectiveCamera( 75, canvas.width / canvas.height, 0.1, 1000 );
camera.position.set(0, 0, 3);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: my_canvas });
renderer.setSize( canvas.width, canvas.height );

const geometry = new THREE.BoxGeometry();

const material = new THREE.MeshBasicMaterial( {
    color: 0xfffff0,
    flatShading: true,
    opacity: 0.9,
    transparent: true,
} );

let cube = new THREE.Mesh( geometry, material );
scene.add( cube );

{
    const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );

    const points = [];
    points.push( new THREE.Vector3( -0.5, -0.5, 0.5 ) );
    points.push( new THREE.Vector3( 0.5, -0.5, 0.5 ) );
    points.push( new THREE.Vector3( 0.5, 0.5, 0.5 ) );
    points.push( new THREE.Vector3( -0.5, 0.5, 0.5 ) );
    points.push( new THREE.Vector3( -0.5, -0.5, 0.5 ) );
    points.push( new THREE.Vector3( -0.5, -0.5, -0.5 ) );
    points.push( new THREE.Vector3( 0.5, -0.5, -0.5 ) );
    points.push( new THREE.Vector3( 0.5, 0.5, -0.5 ) );
    points.push( new THREE.Vector3( -0.5, 0.5, -0.5 ) );
    points.push( new THREE.Vector3( -0.5, -0.5, -0.5 ) );
    points.push( new THREE.Vector3( -0.5, 0.5, -0.5 ) );
    points.push( new THREE.Vector3( -0.5, 0.5, 0.5 ) );
    points.push( new THREE.Vector3( 0.5, 0.5, 0.5 ) );
    points.push( new THREE.Vector3( 0.5, 0.5, -0.5 ) );
    points.push( new THREE.Vector3( 0.5, -0.5, -0.5 ) );
    points.push( new THREE.Vector3( 0.5, -0.5, 0.5 ) );
    
    const geometry = new THREE.BufferGeometry().setFromPoints( points );

    const line = new THREE.Line( geometry, material );
    
    cube.add( line );
}

function animate() {
    requestAnimationFrame( animate );
    const d = 3;
    const theta = Math.PI - 2 * Math.PI * horizontalViewAngleSlider.value / 100.0;
    const phi = Math.PI / 2 - Math.PI * verticalViewAngleSlider.value / 100.0;
    camera.position.set(d * Math.sin(theta) * Math.cos(phi), d * Math.sin(phi), d * Math.cos(theta) * Math.cos(phi));
    camera.lookAt(0, 0, 0);
    renderer.render( scene, camera );
}
animate();
