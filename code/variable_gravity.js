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

let canvas1;
let ctx;
let spacetime_range;
let vertical_vertical_view_angle;
let horizontal_vertical_view_angle;
let trajectory_position;
let Jonsson_embedding;

let rect1;
let rect2;

let canvas2;
let camera1;
let renderer;
let scene;

let graphs;
let trajectories;
let isDragging;
let dragTrajectory;
let dragEnd;

class Path {
    constructor() {
        this.pts = [];
        this.length_x = 0;
    }
    add(p) {
        if(this.pts.length > 0) {
            this.length_x += Math.abs(p.x - last(this.pts).x);
        }
        this.pts.push(p);
    }
    interpolate_x(u) {
        const target = u * this.length_x;
        let d = 0;
        let i = 0;
        while(target >= d && i < this.pts.length-1) {
            const len = Math.abs(this.pts[i+1].x - this.pts[i].x);
            if(target < d + len) {
                const v = (target - d) / len;
                return lerp(this.pts[i], this.pts[i+1], v);
            }
            d += len;
            i += 1;
        }
        return last(this.pts);
    }
}

function resetMarkers() {
    let was_hovering = false;
    let which_was_hovering = undefined;
    trajectories.forEach( trajectory => {
        for(let iEnd = 0; iEnd < 2; iEnd++) {
            if(trajectory.end_sizes[iEnd] !== trajectory.default_end_sizes[iEnd]) {
                was_hovering = true;
                which_was_hovering = trajectory;
            }
            trajectory.end_sizes[iEnd] = trajectory.default_end_sizes[iEnd];
            trajectory.end_colors[iEnd] = trajectory.color;
        }
    });
    return [was_hovering, which_was_hovering];
}

function findClosestEnd(mousePos, graph, radius) {
    let withinRadius = false;
    let whichTrajectory;
    let whichEnd;
    let d_min = Number.MAX_VALUE;
    trajectories.forEach( trajectory => {
        for(let iEnd = 0; iEnd < 2; iEnd++) {
            const d = dist(mousePos, graph.transform.forwards(trajectory.ends[iEnd]));
            if( d < radius && d < d_min) {
                d_min = d;
                withinRadius = true;
                whichTrajectory = trajectory;
                whichEnd = iEnd;
            }
        }
    });
    return [withinRadius, whichTrajectory, whichEnd];
}

function onMouseMove( evt ) {
    const mousePos = getMousePos(canvas1, evt);
    const targetGraph = graphs.find( graph => graph.rect.pointInRect(mousePos) );
    if(targetGraph) {
        if(isDragging) {
            // move the handle being dragged
            dragTrajectory.ends[dragEnd] = targetGraph.transform.backwards(mousePos);
            // recompute the trajectory
            [dragTrajectory.points, dragTrajectory.color] = getFreeFallPoints(dragTrajectory.ends, earth_mass);
            dragTrajectory.hover_color = dragTrajectory.color;
            dragTrajectory.end_colors[0] = dragTrajectory.color;
            dragTrajectory.end_colors[1] = dragTrajectory.color;
            updateTrajectory(dragTrajectory);
        }
        else {
            // indicate which marker is being hovered over
            const [wasHovering, whichTrajectoryWasHovering] = resetMarkers();
            const [isHovering, hoveredTrajectory, hoveredEnd] = findClosestEnd(mousePos, targetGraph, 20);
            if(isHovering) {
                hoveredTrajectory.end_sizes[hoveredEnd] = hoveredTrajectory.hover_size;
                hoveredTrajectory.end_colors[hoveredEnd] = hoveredTrajectory.hover_color;
            }
            // update the 3d scene only if the state has changed
            if(wasHovering && !isHovering) {
                updateTrajectory(whichTrajectoryWasHovering);
            }
            else if(isHovering && !wasHovering) {
                updateTrajectory(hoveredTrajectory);
            }
        }
        draw();
    }
}

function onMouseDown( evt ) {
    const mousePos = getMousePos(canvas1, evt);
    const targetGraph = graphs.find( graph => graph.rect.pointInRect(mousePos) );
    if(targetGraph) {
        [isDragging, dragTrajectory, dragEnd] = findClosestEnd(mousePos, targetGraph, 20);
        if(isDragging) {
            dragTrajectory.end_sizes[dragEnd] = dragTrajectory.hover_size;
            dragTrajectory.end_colors[dragEnd] = dragTrajectory.hover_color;
        }
    }
}

function onMouseUp( evt ) {
    if(isDragging) {
        isDragging = false;
        draw();
    }
}

function getFreeFallPointsFromPeak(peak, planet_mass, n_pts = 100) {
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

function last(arr) {
    return arr[arr.length-1];
}

function first_or_last(arr, first) {
    return first ? arr[0] : last(arr);
}

function getFreeFallPoints(markers, planet_mass) {
    const h0 = markers[0].y;
    const t0 = markers[0].x;
    const h1 = markers[1].y;
    let t1 = markers[1].x;
    if(t1 === t0) {
        // avoid need for infinite speed
        t1 += 1e-3;
    }
    [orbit_type, v0, peakness] = getOrbitalType(h0, t0, h1, t1, planet_mass);
    let vmin = 0;
    let vmax = 0;
    let first = true;
    const fudge = 1e-3;
    if(orbit_type === 'elliptic') {
        if(t1 < t0 && h1 > h0) {
            vmin = -escapeVelocity(h0, planet_mass) + fudge;
            vmax = -minimumSpeedElliptic(h0, h1, planet_mass) - fudge;
            first = (peakness === 'before peak');
        }
        else {
            if(h1 > h0) {
                vmin = minimumSpeedElliptic(h0, h1, planet_mass) + fudge;
            }
            else {
                vmin = -escapeVelocity(h0, planet_mass) + fudge;
            }
            vmax = escapeVelocity(h0, planet_mass) - fudge;
            first = (peakness === 'before peak');
        }
    }
    else if(orbit_type === 'hyperbolic' && v0 === 'positive') {
        vmin = escapeVelocity(h0, planet_mass) + fudge;
        vmax = 1e12;
        first = true;
    }
    else if(orbit_type === 'hyperbolic' && v0 === 'negative') {
        vmin = -escapeVelocity(h0, planet_mass) - fudge;
        vmax = -1e12;
        first = true;
    }
    // check vmin and vmax
    try {
        try {
            var vmin_orbit = collisionTimes(h0, vmin, t0, h1, earth_mass);
            if(vmin_orbit.orbit !== orbit_type) {
                //throw new Error("orbit type mismatch for vmin");
            }
        } catch(err) {
            throw new Error("vmin error: "+err);
        }
        try {
            var vmax_orbit = collisionTimes(h0, vmax, t0, h1, earth_mass);
            if(vmax_orbit.orbit !== orbit_type) {
                //throw new Error("orbit type mismatch for vmax");
            }
        } catch(err) {
            throw new Error("vmax error: "+err);
        }
        const vmin_t = first_or_last(vmin_orbit.t, first);
        const vmax_t = first_or_last(vmax_orbit.t, first);
        if(Math.sign(t1 - vmin_t) === Math.sign(t1 - vmax_t)) {
            throw new Error('t1 ('+t1.toFixed(4)+') should lie between: '+vmin_t.toFixed(4)+" and "+vmax_t.toFixed(4));
        }
    } catch(err) {
        console.log(vmin, vmax, first);
        console.log('vmin_orbit =', vmin_orbit);
        console.log('vmax_orbit =', vmax_orbit);
        throw new Error("Internal error: failed to validate vmin and vmax: "+err);
    }
    // find v
    const v = bisection_search(t1, vmin, vmax, 200, v => {
        const h1_times = collisionTimes(h0, v, t0, h1, earth_mass);
        return first_or_last(h1_times.t, first);
    });
    {
        // validate the velocity
        const t = first_or_last(collisionTimes(h0, v, t0, h1, earth_mass).t, first);
        if(!isClose(t, t1, 1e-1, 1e-1)) {
            console.log(collisionTimes(h0, v, t0, h1, earth_mass));
            throw new Error("Bad solution before peak: "+t.toFixed(4)+" (t1 ="+t1.toFixed(4)+")");
        }
    }
    let pts = new Path();

    const v_h0_times = collisionTimes(h0, v, t0, h0, earth_mass);
    if(v_h0_times.orbit=='elliptic') {
        var h_max = Math.min(earth_radius + 1e8, v_h0_times.peak.y);
        var n_pts = 500;
    }
    else {
        var h_max = Math.max(earth_radius + 1e8, spacetime_range.ymax);
        var n_pts = 500;
    }
    const h_step = (h_max - earth_radius) / n_pts;
    for(let h = earth_radius; h < h_max; h += h_step) {
        const v_h_times = collisionTimes(h0, v, t0, h, earth_mass);
        pts.add(new P(v_h_times.t[0], h));
    }
    if(v_h0_times.orbit=='elliptic') {
        for(let h = h_max; h > earth_radius; h -= h_step) {
            const v_h_times = collisionTimes(h0, v, t0, h, earth_mass);
            pts.add(new P(last(v_h_times.t), h));
        }
    }
    if(pts.pts.length === 0) {
        pts.add(markers[0]);
        pts.add(markers[1]);
    }
    return [pts, (v_h0_times.orbit==='elliptic'?'rgb(100,100,200)':'rgb(200,100,100)')];
}

function testEmbeddingByPathLengths() {
    // generate trajectories that start and end at the same points, for different values of g
    // measure their arc length on the embedding - the one for the correct g should be the shortest
    const time_to_fall = 1; // pick a time
    for(let dm = -earth_mass *0.7; dm < earth_mass / 2; dm += earth_mass / 20) {
        const planet_mass = earth_mass + dm;
        const h = findInitialHeight(time_to_fall, earth_radius, planet_mass);
        const pts = getFreeFallPointsFromPeak(0, h, earth_radius, planet_mass, 100).map(p => Jonsson_embedding.getEmbeddingPointFromSpacetime(p));
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
        const pts = getFreeFallPointsFromPeak(0, h, earth_radius, planet_mass, 200);
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
    canvas1 = document.getElementById('canvas1');
    ctx = canvas1.getContext('2d');

    Jonsson_embedding = new JonssonEmbedding();
    const height = 21e6;
    const time_width = freeFallTime(height + earth_radius, earth_radius, earth_mass);
    spacetime_range = new Rect( new P(-time_width, earth_radius), new P(2 * time_width, height));

    const verticalViewAngleSlider = document.getElementById("verticalViewAngleSlider");
    vertical_view_angle = 20 - 40 * verticalViewAngleSlider.value / 100.0;
    verticalViewAngleSlider.oninput = function() {
        vertical_view_angle = 20 - 40 * verticalViewAngleSlider.value / 100.0;
        draw();
    }

    const horizontalViewAngleSlider = document.getElementById("horizontalViewAngleSlider");
    horizontal_view_angle = Math.PI + 2 * Math.PI * horizontalViewAngleSlider.value / 100.0;
    horizontalViewAngleSlider.oninput = function() {
        horizontal_view_angle = Math.PI + 2 * Math.PI * horizontalViewAngleSlider.value / 100.0;
        draw();
    }

    const moveAlongTrajectoryCheckbox = document.getElementById('moveAlongTrajectoryCheckbox');
    const trajectorySlider = document.getElementById('trajectorySlider');
    moveAlongTrajectoryCheckbox.onclick = function() {
        verticalViewAngleSlider.disabled = moveAlongTrajectoryCheckbox.checked;
        horizontalViewAngleSlider.disabled = moveAlongTrajectoryCheckbox.checked;
        draw();
    }
    trajectorySlider.oninput = function() {
        trajectory_position = trajectorySlider.value / 100;
        draw();
    }

    const make_trajectory = (a, b, color) => {
        const trajectory = new Trajectory(a, b, color, color); // TODO: darken hover color
        [trajectory.points, trajectory.color] = getFreeFallPoints(trajectory.ends, earth_mass);
        trajectory.hover_color = trajectory.color;
        trajectory.end_colors[0] = trajectory.color;
        trajectory.end_colors[1] = trajectory.color;
        return trajectory;
    };
    trajectories = [];
    trajectories.push(make_trajectory(new P(0, earth_radius), new P(20*60, earth_radius + 4.3e6), 'rgb(200,100,100)'));

    const n_graphs = 1;
    const margin = 40;
    const size = Math.min(canvas1.height-margin*2, (canvas1.width-margin*(n_graphs+1)) / n_graphs);
    rect1 = new Rect( new P(margin+(margin+size)*0,50), new P(size,size));
    //rect2 = new Rect( new P(margin+(margin+size)*1,50), new P(size,size));

    // define the standard spacetime graph
    const flipY = p => new P(p.x, spacetime_range.ymax - p.y + spacetime_range.ymin);
    const flipYTransform = new Transform( flipY, flipY );
    const standardAxes = new Graph( rect1, undefined, new ComposedTransform( flipYTransform, new LinearTransform2D(spacetime_range, rect1) ),
                                    "time "+rightArrow,
                                    "[Earth surface "+rightArrow+" "+getDistanceLabel(spacetime_range.size.y)+" above Earth surface]", "" );

    graphs = [ standardAxes ];

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

    init3js();

    draw();

    canvas1.addEventListener( 'mousemove', onMouseMove, false );
    canvas1.addEventListener( 'mousedown', onMouseDown, false );
    canvas1.addEventListener( 'mouseup',   onMouseUp, false );
}

function draw() {
    // fill canvas1 with light gray
    ctx.fillStyle = 'rgb(240,240,240)';
    ctx.beginPath();
    ctx.rect(0,0,canvas1.width, canvas1.height);
    ctx.fill();

    drawStandardAxes(graphs[0]);
    draw3d()
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
        // show the trajectory position
        const p = trajectory.points.interpolate_x(trajectory_position);
        const p1 = add(graph.transform.forwards(p), new P(0, 5));
        const p2 = add(graph.transform.forwards(p), new P(0, -5));
        const p3 = add(graph.transform.forwards(p), new P(5, 0));
        const p4 = add(graph.transform.forwards(p), new P(-5, 0));
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.stroke();
    });

    if(typeof test_geodesic != 'undefined') {
        // draw the test geodesic
        const test_geodesic_screen_pts = test_geodesic.map(graph.transform.forwards);
        drawLine(test_geodesic_screen_pts, 'rgb(0,0,0)');
    }

    // DEBUG: draw some test trajectories
    /*const t0 = trajectories[0].ends[0].x;
    const h0 = trajectories[0].ends[0].y;
    ctx.lineWidth=0.5;
    for(let v = 2000; v<30000; v += 1001) {
        const v_h0_times = collisionTimes(h0, v, t0, h0, earth_mass);
        if(v_h0_times.orbit=='elliptic') { var h_max = v_h0_times.peak.y; }
        else { var h_max = earth_radius + 25e6; }
        let pts_first = [];
        let pts_last = [];
        for(let h = h0; h < h_max; h+=(h_max-h0)/1000) {
            const v_h_times = collisionTimes(h0, v, t0, h, earth_mass);
            pts_first.push(new P(v_h_times.t[0], h));
            pts_last.push(new P(last(v_h_times.t), h));
        }
        if(v_h0_times.orbit!='elliptic') { var color = 'rgb(255,100,0)'; }
        else { var color = 'rgb(0,0,255)'; }
        //drawLine(pts_first.map(graph.transform.forwards), color);
        //if(v_h0_times.orbit=='elliptic') { drawLine(pts_last.map(graph.transform.forwards), 'rgb(0,100,255)'); }
    }
    // DEBUG: draw the peak line
    let peak_pts = [];
    for(let h = spacetime_range.ymax; h > h0; h -= spacetime_range.size.y / 100) {
        const t = peakTimes(h0, t0, h, earth_mass)[0];
        peak_pts.push(new P(t, h));
    }
    for(let h = h0; h < spacetime_range.ymax; h += spacetime_range.size.y / 100) {
        const t = peakTimes(h0, t0, h, earth_mass)[1];
        peak_pts.push(new P(t, h));
    }
    ctx.lineWidth=0.5;
    drawLine(peak_pts.map(graph.transform.forwards), 'rgb(50,255,150)');
    // DEBUG: draw the escape velocity line
    let escape_pts = [[],[]];
    for(let h = spacetime_range.ymin; h < spacetime_range.ymax; h += spacetime_range.size.y / 100) {
        const t = escapeVelocityTimes(h0, t0, h, earth_mass);
        escape_pts[0].push(new P(t[0], h));
        escape_pts[1].push(new P(t[1], h));
    }
    ctx.lineWidth=0.5;
    escape_pts.forEach(pts => drawLine(pts.map(graph.transform.forwards), 'rgb(255,50,150)'));
    // DEBUG: draw the zero velocity at t_0 line
    let zero_pts = [];
    for(let h = spacetime_range.ymin; h < h0; h += spacetime_range.size.y / 100) {
        const t = collisionTimes(h0, 0, t0, h, earth_mass).t[0];
        zero_pts.push(new P(t, h));
    }
    for(let h = h0; h > spacetime_range.ymin; h -= spacetime_range.size.y / 100) {
        const t = collisionTimes(h0, 0, t0, h, earth_mass).t[1];
        zero_pts.push(new P(t, h));
    }
    if(zero_pts.length > 0) {
        ctx.lineWidth=0.5;
        drawLine(zero_pts.map(graph.transform.forwards), 'rgb(50,150,255)');
    }*/

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
    const pts = trajectory.points.pts.map(transform);
    ctx.lineWidth = 1.5;
    drawLine(pts, color);
    for(let i =0; i < 2; i++) {
        fillCircle(transform(trajectory.ends[i]), trajectory.end_sizes[i], trajectory.end_colors[i]);
    }
}

function curvePathFromPoints(pts) {
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

    const funnel_geometry = new THREE.BufferGeometry();
    funnel_geometry.setIndex( strip_faces );
    funnel_geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( strip_vertices, 3 ) );
    funnel_geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( strip_normals, 3 ) );

    const funnel_material = new THREE.MeshBasicMaterial({
        color: 'rgb(250,250,250)',
        opacity: 0.9,
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
            draw3d();
        });

    } ); //end load function
}

function updateTrajectory(trajectory) {
    scene.remove(trajectory.objects.tube);
    trajectory.objects.handles.forEach(handle => { scene.remove(handle); });
    trajectory.objects.handle_geometries.forEach(handle_geometry => { handle_geometry.dispose(); });
    trajectory.objects.tube_geometry.dispose();
    trajectory.objects.material.dispose();
    trajectory.objects = add3dTrajectory(trajectory);
}

function add3dTrajectory(trajectory) {
    const material = new THREE.MeshStandardMaterial({ color: trajectory.color });
    const peak = trajectory.ends[0];

    // add a trajectory
    const pts = trajectory.points.pts.map(p => Jonsson_embedding.getEmbeddingPointFromSpacetime(p));
    const curvePath = curvePathFromPoints(pts);
    const tube_geometry = new THREE.TubeBufferGeometry( curvePath, 500, 0.01, 8, false );
    const tube = new THREE.Mesh( tube_geometry, material );
    scene.add( tube );

    // add spheres at the handles
    let handles = [];
    let handle_geometries = [];
    for(let i = 0; i < trajectory.ends.length; i++) {
        const handle3D = Jonsson_embedding.getEmbeddingPointFromSpacetime(trajectory.ends[i]);
        const handle_geometry = new THREE.SphereGeometry(trajectory.end_sizes[i] * 0.01, 32, 32);
        handle_geometry.translate(handle3D.x, handle3D.y, handle3D.z);
        const handle = new THREE.Mesh(handle_geometry, material);
        scene.add(handle);
        handles.push(handle);
        handle_geometries.push(handle_geometry);
    }

    // return pointers so that we can dispose of the objects to change the trajectory
    return { tube_geometry: tube_geometry, tube: tube, handle_geometries: handle_geometries, handles: handles,
             material: material};
}

function init3js() {
    canvas2 = document.getElementById('canvas2');

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 'rgb(255,255,255)' );

    const ambientLight = new THREE.AmbientLight( 0xcccccc, 0.4 );
    scene.add( ambientLight );

    camera1 = new THREE.PerspectiveCamera( 22, canvas2.width / canvas2.height, 0.1, 1000 );

    const pointLight = new THREE.PointLight( 0xffffff, 0.8 );
    camera1.add(pointLight);

    scene.add(camera1);

    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas2 });

    addFunnel(scene);

    trajectories.forEach(trajectory => {
        trajectory.objects = add3dTrajectory(trajectory);
    });
}

function draw3d() {
    if(document.getElementById('moveAlongTrajectoryCheckbox').checked) {
        // lock the camera to the ant
        const trajectory = trajectories[0];
        const du = 0.001;
        const sp = trajectory.points.interpolate_x(trajectory_position);
        const p = Jonsson_embedding.getEmbeddingPointFromSpacetime(sp);
        const n = Jonsson_embedding.getSurfaceNormalFromSpacetime(sp);
        if(trajectory_position < 1 - du) {
            const p2 = Jonsson_embedding.getEmbeddingPointFromSpacetime(trajectory.points.interpolate_x(trajectory_position + du));
            var v = normalize(sub(p2, p));
        }
        else {
            const p2 = Jonsson_embedding.getEmbeddingPointFromSpacetime(trajectory.points.interpolate_x(trajectory_position - du));
            var v = normalize(sub(p, p2));
        }
        const cam_pos = add(add(p, scalar_mul(n, 0.4)), scalar_mul(v, -0.8));
        const cam_look_at = p;
        camera1.position.set(cam_pos.x, cam_pos.y, cam_pos.z);
        camera1.up.set(n.x, n.y, n.z);
        camera1.lookAt(cam_look_at.x, cam_look_at.y, cam_look_at.z);
    }
    else {
        const d = 10;
        const z = 1;
        const theta = - Math.PI / 2 + 2 * Math.PI * horizontalViewAngleSlider.value / 100.0;
        const phi = - Math.PI / 2 + Math.PI * verticalViewAngleSlider.value / 100.0;
        camera1.position.set(d * Math.sin(theta) * Math.cos(phi), d * Math.cos(theta) * Math.cos(phi), z + d * Math.sin(phi));
        camera1.up.set(0, 0, 1);
        camera1.lookAt(0, 0, z);
    }
    renderer.render( scene, camera1 );
}

window.onload = init;
