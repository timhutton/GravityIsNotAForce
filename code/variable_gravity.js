/*  GravityIsNotAForce - Visualising geodesics in general relativity
    Copyright (C) 2020 Tim J. Hutton

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

let canvas;
let ctx;
let spacetime_range;
let vertical_vertical_view_angle;
let horizontal_vertical_view_angle;
let Jonsson_embedding;
let camera;

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

function testEmbeddingByPathLengths() {
    // generate trajectories that start and end at the same points, for different values of g
    // measure their arc length on the embedding - the one for the correct g should be the shortest
    const time_to_fall = 1; // pick a time
    for(let dm = -earth_mass *0.7; dm < earth_mass / 2; dm += earth_mass / 20) {
        const planet_mass = earth_mass + dm;
        const h = findInitialHeight(time_to_fall, earth_radius, planet_mass);
        const pts = getFreeFallPoints(0, h, earth_radius, planet_mass, 100).map(p => Jonsson_embedding.getEmbeddingPointFromSpacetime(p));
        let length = 0;
        for(let iPt = 1; iPt < pts.length; iPt++) {
            length += dist(pts[iPt], pts[iPt-1]);
        }
        console.log(dm, h, length);
    }
    throw new Error(); // to stop the rest of the script
}

function testEmbeddingByPathTurning() {
    // generate trajectories that start and end at the same points, for different values of g
    // measure how much they deviate from the plane that includes the surface normal
    const time_to_fall = 1; // pick a time
    [-earth_mass * 0.1, 0, earth_mass * 0.1].forEach( dm => {
        const planet_mass = earth_mass + dm;
        const h = findInitialHeight(time_to_fall, earth_radius, planet_mass);
        const pts = getFreeFallPoints(0, h, earth_radius, planet_mass, 200);
        let sum_turns = 0;
        let sum_abs_turns = 0;
        for(let iPt = 1; iPt < pts.length-1; iPt++) {
            const p = Jonsson_embedding.getEmbeddingPointFromSpacetime(pts[iPt]);
            const n = Jonsson_embedding.getSurfaceNormalFromSpacetime(pts[iPt]);
            const pre = Jonsson_embedding.getEmbeddingPointFromSpacetime(pts[iPt-1]);
            const post = Jonsson_embedding.getEmbeddingPointFromSpacetime(pts[iPt+1]);
            const incoming_segment = sub(p, pre);
            const outgoing_segment = sub(post, p);
            const norm_vec = normalize(cross(incoming_segment, n));
            const turning_angle = Math.asin(dot(outgoing_segment, norm_vec) / len(outgoing_segment));
            sum_turns += turning_angle;
            sum_abs_turns += Math.abs(turning_angle);
            console.log(dm, turning_angle);
        }
    });
    throw new Error(); // to stop the rest of the script
}

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    Jonsson_embedding = new JonssonEmbedding();
    const height = 21e6;
    const time_width = freeFallTime(height + earth_radius, earth_radius, earth_mass);
    spacetime_range = new Rect( new P(-time_width, earth_radius), new P(2 * time_width, height));

    const verticalViewAngleSlider = document.getElementById("verticalViewAngleSlider");
    vertical_view_angle = 20 - 40 * verticalViewAngleSlider.value / 100.0;
    verticalViewAngleSlider.oninput = function() {
        vertical_view_angle = 20 - 40 * verticalViewAngleSlider.value / 100.0;
        camera.p.z = -vertical_view_angle;
        draw();
    }

    const horizontalViewAngleSlider = document.getElementById("horizontalViewAngleSlider");
    horizontal_view_angle = Math.PI + 2 * Math.PI * horizontalViewAngleSlider.value / 100.0;
    horizontalViewAngleSlider.oninput = function() {
        horizontal_view_angle = Math.PI + 2 * Math.PI * horizontalViewAngleSlider.value / 100.0;
        camera.p.x = 10*Math.cos(-horizontal_view_angle);
        camera.p.y = 10*Math.sin(-horizontal_view_angle);
        draw();
    }

    const make_trajectory = (peak, color) => {
        return new Trajectory(peak, peak, color, color); // TODO: darken hover color
    };
    trajectories = [];
    trajectories.push(make_trajectory(new P(0, earth_radius + 20e6), 'rgb(100,100,200)'));
    trajectories.push(make_trajectory(new P(0, earth_radius + 5e6), 'rgb(200,100,100)'));
    trajectories.push(make_trajectory(new P(0, earth_radius + 2.5e6), 'rgb(200,100,200)'));
    trajectories.push(make_trajectory(new P(0, earth_radius + 1.25e6), 'rgb(100,200,100)'));

    const n_graphs = 2;
    const margin = 40;
    const size = Math.min(canvas.height-margin*2, (canvas.width-margin*(n_graphs+1)) / n_graphs);
    const rect1 = new Rect( new P(margin+(margin+size)*0,50), new P(size,size));
    const rect2 = new Rect( new P(margin+(margin+size)*1,50), new P(size,size));
    
    // define the standard spacetime graph
    const flipY = p => new P(p.x, spacetime_range.ymax - p.y + spacetime_range.ymin);
    const flipYTransform = new Transform( flipY, flipY );
    const standardAxes = new Graph( rect1, undefined, new ComposedTransform( flipYTransform, new LinearTransform2D(spacetime_range, rect1) ),
                                    "time "+rightArrow,
                                    "[Earth surface "+rightArrow+" "+getDistanceLabel(spacetime_range.size.y)+" above Earth surface]", "" );

    // define the Jonsson embedding graph
    const identityTransform = p => new P(p.x, p.y, p.z);
    const JonssonEmbeddingTransform = new Transform( p => Jonsson_embedding.getEmbeddingPointFromSpacetime(p), identityTransform );
    camera = new Camera(new P(10*Math.cos(-horizontal_view_angle),10*Math.sin(-horizontal_view_angle), -vertical_view_angle),
                        new P(0,0,1), new P(0,0,1), 1200, rect2.center);
    const cameraTransform = new Transform( p => camera.project(p), identityTransform );
    const JonssonEmbeddingAxes = new Graph( rect2, undefined, new ComposedTransform( JonssonEmbeddingTransform, cameraTransform),
                                          "Jonsson embedding", "", "");
                                          
    graphs = [ standardAxes, JonssonEmbeddingAxes ];

    // To validate the surface, we compute a geodesic by walking along it, using the surface normals.
    // We get a good agreement with our free-fall code.
    if(false) { // (set to true to see the comparison)
        const start = new P(0, earth_radius + 20e6);
        const spacetime_velocity = new P(1, 0); // first entry must always be 1 (one second per second). second entry is height change in m/s
        const step_size = 2; // (too big and the geodesic integration will cause errors)
        const p2 = add(start, scalar_mul(spacetime_velocity, step_size));
        test_geodesic = Jonsson_embedding.getGeodesicPoints(start, p2, 5000);

        // something else to try: escape velocity
        /*const start = new P(0, earth_radius);
        const spacetime_velocity = new P(1, 11186); // first entry must always be 1 (one second per second). second entry is height change in m/s
        const step_size = 2; // (too big and the geodesic integration will cause errors)
        const p2 = add(start, scalar_mul(spacetime_velocity, step_size));
        test_geodesic = Jonsson_embedding.getGeodesicPoints(start, p2, 5000);*/
    }

    draw();

    canvas.addEventListener( 'mousemove', onMouseMove, false );
    canvas.addEventListener( 'mousedown', onMouseDown, false );
    canvas.addEventListener( 'mouseup',   onMouseUp, false );
}

function draw() {
    // fill canvas with light gray
    ctx.fillStyle = 'rgb(240,240,240)';
    ctx.beginPath();
    ctx.rect(0,0,canvas.width, canvas.height);
    ctx.fill();

    drawStandardAxes(graphs[0]);
    drawJonssonEmbedding(graphs[1]);
}

function drawStandardAxes(graph) {
    ctx.save(); // save the original clip for now

    // fill background with white
    ctx.fillStyle = 'rgb(255,255,255)';
    ctx.beginPath();
    ctx.rect(graph.rect.xmin, graph.rect.ymin, graph.rect.size.x, graph.rect.size.y);
    ctx.fill();
    ctx.clip(); // clip to this rect until restored

    // draw axes
    const x_axis = getLinePoints(spacetime_range.min, new P(spacetime_range.xmax, spacetime_range.ymin), 2);
    const y_axis = getLinePoints(new P(0, spacetime_range.ymin), new P(0, spacetime_range.ymax), 2);
    let minor_axes = [];
    const y_step = divideNicely(spacetime_range.size.y, 7);
    for(let y = spacetime_range.ymin; y<=spacetime_range.ymax; y+= y_step) {
        minor_axes.push(getLinePoints(new P(spacetime_range.xmin, y), new P(spacetime_range.xmax, y), 2));
    }
    const x_step = 60 * divideNicely(spacetime_range.size.x / 60, 7); // divide into a nice number of minutes
    for(let x = x_step; x<=spacetime_range.xmax; x+= x_step) {
        minor_axes.push(getLinePoints(new P(x, spacetime_range.ymin), new P(x, spacetime_range.ymax), 2));
    }
    for(let x = -x_step; x>=spacetime_range.xmin; x-= x_step) {
        minor_axes.push(getLinePoints(new P(x, spacetime_range.ymin), new P(x, spacetime_range.ymax), 2));
    }
    const minor_axes_color = 'rgb(210,210,210)';
    minor_axes.forEach( axes => { drawLine(axes.map(graph.transform.forwards), minor_axes_color); } );
    const major_axes_color = 'rgb(50,50,50)';
    drawLine(x_axis.map(graph.transform.forwards), major_axes_color);
    drawLine(y_axis.map(graph.transform.forwards), major_axes_color);

    // indicate scale
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const drawTimeLabel = x => drawText(graph.transform.forwards(new P(x, spacetime_range.ymin)), getTimeLabel(x));
    for(let x = x_step; x<=spacetime_range.xmax; x+= x_step) {
        drawTimeLabel(x);
    }
    for(let x = -x_step; x>=spacetime_range.xmin; x-= x_step) {
        drawTimeLabel(x);
    }
    for(let h = spacetime_range.ymin + y_step; h < spacetime_range.ymax; h+=y_step) {
        drawText(graph.transform.forwards(new P(0, h)), getDistanceLabel(h - earth_radius));
    }

    // draw some geodesics
    trajectories.forEach(trajectory => {
        drawTrajectory(trajectory, graph.transform.forwards, trajectory.color);
    });

    if(typeof test_geodesic != 'undefined') {
        // draw the test geodesic
        const test_geodesic_screen_pts = test_geodesic.map(graph.transform.forwards);
        drawLine(test_geodesic_screen_pts, 'rgb(0,0,0)');
    }

    ctx.restore(); // restore the original clip

    // show the graph labels
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(graph.bottom_text, graph.rect.center.x, graph.rect.ymax + 15);
    ctx.fillText(graph.top_text,    graph.rect.center.x, graph.rect.ymin - 15);
    ctx.save();
    ctx.translate(graph.rect.xmin - 15, graph.rect.center.y);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center";
    ctx.fillText(graph.left_text, 0, 0);
    ctx.restore();
}

function drawJonssonEmbedding(graph) {
    // axes that go in the time direction (circles)
    let time_minor_axes_h = [earth_radius, earth_radius + 0.1, earth_radius + 0.25, earth_radius + 0.5];
    for(let i = 5; i < 1000; i += 5) {
        time_minor_axes_h.push(earth_radius + 1e6 * i);
    }
    const time_minor_axes_zrh = time_minor_axes_h.map(h => {
        const x = Jonsson_embedding.getXFromSpace(h);
        const delta_z = Jonsson_embedding.getDeltaZFromX(x);
        const radius = Jonsson_embedding.getRadiusFromX(x);
        return [delta_z, radius, h];
    });
    const time_minor_axes = time_minor_axes_zrh.map(zrh => getEllipsePoints(new P(0,0,zrh[0]), new P(zrh[1],0), new P(0,zrh[1]), 60));

    // axes that go in the space directions (curved lines to infinity, repeated by rotation)
    const space_axis_delta_z = [];
    let h = 0;
    let h_step = 0.01;
    const max_height = 1e9;
    let next_change = 1;
    while(h < max_height) {
        space_axis_delta_z.push(Jonsson_embedding.getEmbeddingPointFromSpacetime(new P(0, h + earth_radius)));
        h += h_step;
        if(h >= next_change) {
            next_change *= 10;
            h_step *= 10;
        }
    }
    const base = 10;
    const time_step = 60 * divideNicely(Jonsson_embedding.delta_t_real / 60, 11); // pick a division in minutes that looks sensible
    const time_step_angle = 2 * Math.PI * time_step / Jonsson_embedding.delta_t_real;
    const n_time_steps = Math.floor(0.5 * Jonsson_embedding.delta_t_real / time_step) + 1;
    const time_step_angles = [0];
    for(let it = 1; it < n_time_steps; it++) {
        time_step_angles.push(time_step_angle * it);
        time_step_angles.push(-time_step_angle * it);
    }

    ctx.save(); // save the original clip for now

    // fill background with white
    ctx.fillStyle = 'rgb(255,255,255)';
    ctx.beginPath();
    ctx.rect(graph.rect.xmin, graph.rect.ymin, graph.rect.size.x, graph.rect.size.y);
    ctx.fill();
    ctx.clip(); // clip to this rect until restored

    // draw minor axes
    const minor_axes_color = 'rgb(210,210,210)';
    time_minor_axes.slice(1).forEach( axes => { drawLine(axes.map(p => camera.project(p)), minor_axes_color); } );
    time_step_angles.slice(1).forEach( theta => drawLine(space_axis_delta_z.map(p => rotateXY(p, theta)).map(p => camera.project(p)), minor_axes_color) );
    // draw major axes
    const major_axes_color = 'rgb(50,50,50)';
    drawLine(time_minor_axes[0].map(p => camera.project(p)), major_axes_color);
    drawLine(space_axis_delta_z.map(p => camera.project(p)), major_axes_color);

    // indicate scale
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const drawTimeLabel = x => {
        const label = getTimeLabel(x);
        drawText(graph.transform.forwards(new P(x, spacetime_range.ymin)), label);
    };
    //for(let i = -n_time_steps + 2; i < n_time_steps - 1; i++) {
    for(let i = 0; i < 3; i++) {
        if(i==0) { continue; }
        const x = i * time_step;
        drawTimeLabel(x);
    }
    for(let h = 5e6; h < 50e6; h += 5e6) {
        const x = Jonsson_embedding.getXFromSpace(h + earth_radius);
        const delta_z = Jonsson_embedding.getDeltaZFromX(x);
        const radius = Jonsson_embedding.getRadiusFromX(x);
        const label = getDistanceLabel(h);
        const p = new P(radius, 0, delta_z);
        drawText(camera.project(p), label);
    }

    // draw some geodesics
    trajectories.forEach(trajectory => {
        drawTrajectory(trajectory, graph.transform.forwards, trajectory.color);
    });

    if(typeof test_geodesic != 'undefined') {
        // draw the test geodesic
        const test_geodesic_screen_pts = test_geodesic.map(graph.transform.forwards);
        drawLine(test_geodesic_screen_pts, 'rgb(0,0,0)');
    }

    ctx.restore(); // restore the original clip

    // show the graph labels
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(graph.bottom_text, graph.rect.center.x, graph.rect.ymax + 15);
    ctx.fillText(graph.top_text,    graph.rect.center.x, graph.rect.ymin - 15);
    ctx.save();
    ctx.translate(graph.rect.xmin - 15, graph.rect.center.y);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center";
    ctx.fillText(graph.left_text, 0, 0);
    ctx.restore();
}

function drawTrajectory(trajectory, transform, color) {
    const pts = getFreeFallPoints(trajectory.ends[0], earth_mass, 1500).map(transform);
    ctx.lineWidth = 1.5;
    drawLine(pts, color);
    fillCircle(transform(trajectory.ends[0]), trajectory.end_sizes[0], trajectory.end_colors[0]);
}

window.onload = init;
