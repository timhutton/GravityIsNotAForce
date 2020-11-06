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
    constructor(rect, frame_acceleration, top_text, left_text) {
        this.rect = rect;
        this.frame_acceleration = frame_acceleration;
        this.top_text = top_text;
        this.left_text = left_text;
    }
}

class GraphT1S1 extends Graph {
    // A graph that plots time on the x-axis and up on the y-axis
    get transform() {
        var forwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, this.frame_acceleration - earth_surface_gravity);
        var backwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, earth_surface_gravity - this.frame_acceleration);
        var accelerationDistortion = new Transform(forwardsDistortion, backwardsDistortion);
        var moveToPosition = new LinearTransform2D(spacetime_range, this.rect);
        return new ComposedTransform(accelerationDistortion, moveToPosition);
    }
}

class GraphS2 extends Graph {
    // A graph that plots one space dimension on the x-axis and up on the y-axis
    get transform() {
        var forwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, this.frame_acceleration - earth_surface_gravity);
        var backwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, earth_surface_gravity - this.frame_acceleration);
        var accelerationDistortion = new Transform(forwardsDistortion, backwardsDistortion);
        var swapXandZ = p => new P(p.z, p.y, p.x, p.w);
        var swapXandZTransform = new Transform(swapXandZ, swapXandZ);
        var spacespace_range = new Rect(new P(spacetime_range.ymin, spacetime_range.ymin), new P(spacetime_range.size.y, spacetime_range.size.y));
        var moveToPosition = new LinearTransform2D(spacespace_range, this.rect);
        return new ComposedTransform(accelerationDistortion, swapXandZTransform, moveToPosition);
    }
}

class GraphT1S2 extends Graph {
    // A graph that plots one time and two space dimensions in a 3D view
    get transform() {
        var forwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, this.frame_acceleration - earth_surface_gravity);
        var backwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, earth_surface_gravity - this.frame_acceleration);
        var accelerationDistortion = new Transform(forwardsDistortion, backwardsDistortion);
        var scaleX = 50;
        var scaleXTransform = new Transform( p => elementwise_mul(p,new P(scaleX,1,1,1)), p => elementwise_mul(p,new P(1/scaleX,1,1,1)) );
        var camera_dist = 1500;
        var camera = new Camera(new P(camera_dist * Math.cos(view_angle), camera_dist/4, camera_dist * Math.sin(view_angle), 0), 
                                spacetime_range.center, new P(0, 1, 0, 0), 1400, this.rect.center);
        var identityTransform = p => new P(p.x, p.y, p.z, p.w);
        var cameraTransform = new Transform( p => camera.project(p), identityTransform );
        return new ComposedTransform(accelerationDistortion, scaleXTransform, cameraTransform);
    }
}
class GraphT1S3 extends Graph {
    // A graph that plots one time and three space dimensions in a 4D view
    get transform() {
        var forwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, this.frame_acceleration - earth_surface_gravity);
        var backwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, earth_surface_gravity - this.frame_acceleration);
        var accelerationDistortion = new Transform(forwardsDistortion, backwardsDistortion);
        var identityTransform = p => new P(p.x, p.y, p.z, p.w);
        // map xyzw onto xyz so that we can use a 3D camera
        var scaleX = 50;
        var projectTransform = new Transform( p => new P( p.w + scaleX*0.8*p.x, p.y, p.z + scaleX*0.2*p.x ), identityTransform );
        var camera_dist = 1500;
        var camera = new Camera(new P(camera_dist * Math.cos(view_angle), camera_dist/4, camera_dist * Math.sin(view_angle), 0),
                                spacetime_range.center, new P(0, 1, 0, 0), 1000, this.rect.center);
        var cameraTransform = new Transform( p => camera.project(p), identityTransform );
        return new ComposedTransform(accelerationDistortion, projectTransform, cameraTransform);
    }
}

// functions:

function drawGeodesic(trajectory, graph) {
    // draw a line that is straight in an inertial frame but may be not be straight in this frame, depending on its acceleration

    var start_inertial = fromEarthSurfaceGravityAcceleratingFrameToInertialFrame(trajectory.ends[0]);
    var end_inertial = fromEarthSurfaceGravityAcceleratingFrameToInertialFrame(trajectory.ends[1]);
    var screen_pts = getLinePoints(start_inertial, end_inertial).map(fromInertialFrameToEarthSurfaceGravityAcceleratingFrame).map(graph.transform.forwards);
    ctx.lineWidth = 2;
    drawLine(screen_pts, trajectory.color);
    fillSpacedCircles(screen_pts, trajectory.mid_size, trajectory.color, 10);
    var a1 = fromInertialFrameToEarthSurfaceGravityAcceleratingFrame(lerp(start_inertial, end_inertial, 0.59));
    var a2 = fromInertialFrameToEarthSurfaceGravityAcceleratingFrame(lerp(start_inertial, end_inertial, 0.60));
    drawArrowHead(graph.transform.forwards(a1), graph.transform.forwards(a2), 15);
    for(var iEnd = 0; iEnd < 2; iEnd++) {
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
    var t_zero = spacetime_range.center.x; // central time point (e.g. t=0) gets no spatial distortion
    var distortion = getDistortionWithConstantAcceleration(p.x, t_zero, delta_acceleration);
    return add(p, distortion);
}

function getDistortionWithConstantAcceleration(t, t0, delta_acceleration) {
    var dy = - distanceTravelledWithConstantAcceleration(t - t0, delta_acceleration);
    return new P(0, dy, 0, 0);
}