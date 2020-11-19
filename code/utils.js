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


// classes:

class Trajectory {
    constructor(start, end, color, hover_color) {
        this.ends = [start, end];
        this.color = color;
        this.end_colors = [color, color];
        this.hover_color = hover_color;
        this.end_sizes = [6, 4];
        this.default_end_sizes = [6, 4];
        this.mid_size = 2;
        this.hover_size = 10;
    }
}

class Graph {
    constructor(rect, frame_acceleration, transform, top_text, left_text, bottom_text) {
        this.rect = rect;
        this.frame_acceleration = frame_acceleration;
        this._transform = transform;
        this.top_text = top_text;
        this.left_text = left_text;
        this.bottom_text = bottom_text;
    }
    get transform() { return this._transform; }
}

class GraphT1S1 extends Graph {
    // A graph that plots time on the x-axis and up on the y-axis
    get transform() {
        const forwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, this.frame_acceleration - earth_surface_gravity);
        const backwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, earth_surface_gravity - this.frame_acceleration);
        const accelerationDistortion = new Transform(forwardsDistortion, backwardsDistortion);
        const moveToPosition = new LinearTransform2D(spacetime_range, this.rect);
        return new ComposedTransform(accelerationDistortion, moveToPosition);
    }
}

class GraphS2 extends Graph {
    // A graph that plots one space dimension on the x-axis and up on the y-axis
    get transform() {
        const forwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, this.frame_acceleration - earth_surface_gravity);
        const backwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, earth_surface_gravity - this.frame_acceleration);
        const accelerationDistortion = new Transform(forwardsDistortion, backwardsDistortion);
        const swapXandZ = p => new P(p.z, p.y, p.x, p.w);
        const swapXandZTransform = new Transform(swapXandZ, swapXandZ);
        const spacespace_range = new Rect(new P(spacetime_range.ymin, spacetime_range.ymin), new P(spacetime_range.size.y, spacetime_range.size.y));
        const moveToPosition = new LinearTransform2D(spacespace_range, this.rect);
        return new ComposedTransform(accelerationDistortion, swapXandZTransform, moveToPosition);
    }
}

class GraphS3 extends Graph {
    // A graph that plots three space dimensions in a 3D view
    get transform() {
        const forwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, this.frame_acceleration - earth_surface_gravity);
        const backwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, earth_surface_gravity - this.frame_acceleration);
        const accelerationDistortion = new Transform(forwardsDistortion, backwardsDistortion);
        const swapXandW = p => new P(p.w, p.y, p.z, p.x);
        const swapXandWTransform = new Transform(swapXandW, swapXandW);
        const camera_dist = 500;
        const camera = new Camera(new P(camera_dist * Math.cos(view_angle), camera_dist/4, camera_dist * Math.sin(view_angle), 0),
                                new P(spacetime_range.center.y, spacetime_range.center.y, spacetime_range.center.y), new P(0, 1, 0, 0), 1400, this.rect.center);
        const identityTransform = p => new P(p.x, p.y, p.z, p.w);
        const cameraTransform = new Transform( p => camera.project(p), identityTransform );
        return new ComposedTransform(accelerationDistortion, swapXandWTransform, cameraTransform);
    }
}

class GraphT1S2 extends Graph {
    // A graph that plots one time and two space dimensions in a 3D view
    get transform() {
        const forwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, this.frame_acceleration - earth_surface_gravity);
        const backwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, earth_surface_gravity - this.frame_acceleration);
        const accelerationDistortion = new Transform(forwardsDistortion, backwardsDistortion);
        const scaleTime = 20;
        const scaleTimeTransform = new Transform( p => elementwise_mul(p,new P(scaleTime,1,1,1)), p => elementwise_mul(p,new P(1/scaleTime,1,1,1)) );
        const camera_dist = 500;
        const camera = new Camera(new P(camera_dist * Math.cos(view_angle), camera_dist/4, camera_dist * Math.sin(view_angle), 0),
                                spacetime_range.center, new P(0, 1, 0, 0), 1400, this.rect.center);
        const identityTransform = p => new P(p.x, p.y, p.z, p.w);
        const cameraTransform = new Transform( p => camera.project(p), identityTransform );
        return new ComposedTransform(accelerationDistortion, scaleTimeTransform, cameraTransform);
    }
}

class GraphT1S3 extends Graph {
    // A graph that plots one time and three space dimensions in a 4D view
    get transform() {
        const forwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, this.frame_acceleration - earth_surface_gravity);
        const backwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, earth_surface_gravity - this.frame_acceleration);
        const accelerationDistortion = new Transform(forwardsDistortion, backwardsDistortion);
        const identityTransform = p => new P(p.x, p.y, p.z, p.w);
        // map xyzw onto xyz so that we can use a 3D camera
        const scaleTime = 20;
        const projectTransform = new Transform( p => new P( p.w + scaleTime*p.x, p.y, p.z ), identityTransform );
        const camera_dist = 500;
        const camera = new Camera(new P(camera_dist * Math.cos(view_angle), camera_dist/4, camera_dist * Math.sin(view_angle), 0),
                                spacetime_range.center, new P(0, 1, 0, 0), 1400, this.rect.center);
        const cameraTransform = new Transform( p => camera.project(p), identityTransform );
        return new ComposedTransform(accelerationDistortion, projectTransform, cameraTransform);
    }
}

// functions:

let graphs;
let trajectories;
let isDragging;
let dragTrajectory;
let dragEnd;

function resetMarkers() {
    trajectories.forEach( trajectory => {
        for(let iEnd = 0; iEnd < 2; iEnd++) {
            trajectory.end_sizes[iEnd] = trajectory.default_end_sizes[iEnd];
            trajectory.end_colors[iEnd] = trajectory.color;
        }
    });
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
    const mousePos = getMousePos(evt);
    const targetGraph = graphs.find( graph => graph.rect.pointInRect(mousePos) );
    if(targetGraph) {
        if(isDragging) {
            // move the handle being dragged
            dragTrajectory.ends[dragEnd] = targetGraph.transform.backwards(mousePos);
        }
        else {
            // indicate which marker is being hovered over
            resetMarkers();
            const [isHovering, hoveredTrajectory, hoveredEnd] = findClosestEnd(mousePos, targetGraph, 20);
            if(isHovering) {
                hoveredTrajectory.end_sizes[hoveredEnd] = hoveredTrajectory.hover_size;
                hoveredTrajectory.end_colors[hoveredEnd] = hoveredTrajectory.hover_color;
            }
        }
        draw();
    }
}

function onMouseDown( evt ) {
    const mousePos = getMousePos(evt);
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
    isDragging = false;
    draw();
}

function drawGeodesic(trajectory, graph) {
    // draw a line that is straight in an inertial frame but may be not be straight in this frame, depending on its acceleration

    const start_inertial = fromEarthSurfaceGravityAcceleratingFrameToInertialFrame(trajectory.ends[0]);
    const end_inertial = fromEarthSurfaceGravityAcceleratingFrameToInertialFrame(trajectory.ends[1]);
    const screen_pts = getLinePoints(start_inertial, end_inertial).map(fromInertialFrameToEarthSurfaceGravityAcceleratingFrame).map(graph.transform.forwards);
    ctx.lineWidth = 2;
    drawLine(screen_pts, trajectory.color);
    fillSpacedCircles(screen_pts, trajectory.mid_size, trajectory.color, 10);
    const a1 = fromInertialFrameToEarthSurfaceGravityAcceleratingFrame(lerp(start_inertial, end_inertial, 0.59));
    const a2 = fromInertialFrameToEarthSurfaceGravityAcceleratingFrame(lerp(start_inertial, end_inertial, 0.60));
    drawArrowHead(graph.transform.forwards(a1), graph.transform.forwards(a2), 15);
    for(let iEnd = 0; iEnd < 2; iEnd++) {
        fillCircle(graph.transform.forwards(trajectory.ends[iEnd]), trajectory.end_sizes[iEnd], trajectory.end_colors[iEnd]);
    }
}

function fromEarthSurfaceGravityAcceleratingFrameToInertialFrame(p) {
    return transformBetweenAcceleratingReferenceFrames(p, 0 - earth_surface_gravity);
}

function fromInertialFrameToEarthSurfaceGravityAcceleratingFrame(p) {
    return transformBetweenAcceleratingReferenceFrames(p, earth_surface_gravity - 0);
}

function transformBetweenAcceleratingReferenceFrames(p, delta_acceleration) {
    const t_zero = spacetime_range.center.x; // central time point (e.g. t=0) gets no spatial distortion
    const distortion = getDistortionWithConstantAcceleration(p.x, t_zero, delta_acceleration);
    return add(p, distortion);
}

function getDistortionWithConstantAcceleration(t, t0, delta_acceleration) {
    const dy = - distanceTravelledWithConstantAcceleration(t - t0, delta_acceleration);
    return new P(0, dy, 0, 0);
}
