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

var graphs;
var trajectories;
var spacetime_range;
var isDragging;
var dragTrajectory;
var dragIsStart;

// classes:

class Trajectory {
    constructor(start, end, color, hover_color) {
        var default_start_size = 6.0;
        var default_end_size = 4.0;
        this.start = start;
        this.end = end;
        this.default_color = color;
        this.start_size = default_start_size;
        this.end_size = default_end_size;
        this.mid_size = 2.0;;
        this.start_color = color;
        this.end_color = color;
        this.default_start_size = default_start_size;
        this.default_end_size = default_end_size;
        this.hover_size = 10.0;;
        this.hover_color = hover_color;
    }
}

class Graph {
    constructor(rect, frame_acceleration) {
        this.rect = rect;
        this.frame_acceleration = frame_acceleration;
    }
    get transform() { 
        var forwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, this.frame_acceleration - earth_surface_gravity);
        var backwardsDistortion = p => transformBetweenAcceleratingReferenceFrames(p, earth_surface_gravity - this.frame_acceleration);
        return new ComposedTransform(new Transform(forwardsDistortion, backwardsDistortion), findBestFitTransform(this));
    }
}

// functions:

function resetMarkers() {
    for(var i = 0; i < trajectories.length; i++) {
        trajectories[i].start_size = trajectories[i].default_start_size;
        trajectories[i].start_color = trajectories[i].default_color;
        trajectories[i].end_size = trajectories[i].default_end_size;
        trajectories[i].end_color = trajectories[i].default_color;
    }
}

function onMouseMove( evt ) {
    if(isDragging) {
        // move the handle being dragged
        var p = getMousePos(evt);
        for(var i = 0; i < graphs.length; i++) {
            if( graphs[i].rect.pointInRect(p) ) {
                // convert p to the coordinate system of this graph
                var delta_acceleration = earth_surface_gravity - graphs[i].frame_acceleration
                p = graphs[i].transform.backwards(p);
                p = transformBetweenAcceleratingReferenceFrames(p, delta_acceleration);
                if(dragIsStart) {
                    trajectories[dragTrajectory].start = p;
                } else {
                    trajectories[dragTrajectory].end = p;
                }
            }
        }
    }
    else {
        // indicate which marker is being hovered over
        resetMarkers();
        var p = getMousePos(evt);
        var hover_radius = 20;
        var d_min = Number.MAX_VALUE;
        var isHovering = false;
        var whichTrajectory;
        var isStart;
        for(var i = 0; i < graphs.length; i++) {
            if( graphs[i].rect.pointInRect(p) ) {
                var delta_acceleration = graphs[i].frame_acceleration - earth_surface_gravity;
                for(var j = 0; j < trajectories.length; j++) {
                    // start?
                    var m = graphs[i].transform.forwards(transformBetweenAcceleratingReferenceFrames(trajectories[j].start, delta_acceleration));
                    var d = dist(p, m);
                    if( d < hover_radius && d < d_min) {
                        d_min = d;
                        isHovering = true;
                        whichTrajectory = j;
                        isStart = true;
                    }
                    // end?
                    m = graphs[i].transform.forwards(transformBetweenAcceleratingReferenceFrames(trajectories[j].end, delta_acceleration));
                    d = dist(p, m);
                    if( d < hover_radius && d < d_min) {
                        d_min = d;
                        isHovering = true;
                        whichTrajectory = j;
                        isStart = false;
                    }
                }
                if(isHovering) {
                    if(isStart) {
                        trajectories[whichTrajectory].start_size = trajectories[whichTrajectory].hover_size;
                        trajectories[whichTrajectory].start_color = trajectories[whichTrajectory].hover_color;
                    }
                    else {
                        trajectories[whichTrajectory].end_size = trajectories[whichTrajectory].hover_size;
                        trajectories[whichTrajectory].end_color = trajectories[whichTrajectory].hover_color;
                    }
                }
                break;
            }
        }
    }
    draw();
}

function onTouchMove( evt ) {
}

function onTouchStart( evt ) {
}

function onTouchEnd( evt ) {
}

function onMouseDown( evt ) {
    var p = getMousePos(evt);
    var grab_radius = 20;
    var d_min = Number.MAX_VALUE;
    for(var i = 0; i < graphs.length; i++) {
        if( graphs[i].rect.pointInRect(p) ) {
            var delta_acceleration = graphs[i].frame_acceleration - earth_surface_gravity;
            for(var j = 0; j < trajectories.length; j++) {
                // start?
                var m = graphs[i].transform.forwards(transformBetweenAcceleratingReferenceFrames(trajectories[j].start, delta_acceleration));
                var d = dist(p, m);
                if( d < grab_radius && d < d_min) {
                    d_min = d;
                    isDragging = true;
                    dragTrajectory = j;
                    dragIsStart = true;
                }
                // end?
                m = graphs[i].transform.forwards(transformBetweenAcceleratingReferenceFrames(trajectories[j].end, delta_acceleration));
                d = dist(p, m);
                if( d < grab_radius && d < d_min) {
                    d_min = d;
                    isDragging = true;
                    dragTrajectory = j;
                    dragIsStart = false;
                }
            }
            if(isDragging) {
                if(dragIsStart) {
                    trajectories[dragTrajectory].start_size = trajectories[dragTrajectory].hover_size;
                    trajectories[dragTrajectory].start_color = trajectories[dragTrajectory].hover_color;
                }
                else {
                    trajectories[dragTrajectory].end_size = trajectories[dragTrajectory].hover_size;
                    trajectories[dragTrajectory].end_color = trajectories[dragTrajectory].hover_color;
                }
            }
            break;
        }
    }
}

function onMouseUp( evt ) {
    isDragging = false;
    resetMarkers();
    draw();
}

function clientToCanvas( clientPos ) {
    var rect = canvas.getBoundingClientRect();
    return new P( clientPos.x - rect.left, clientPos.y - rect.top );
}

function getMousePos(evt) {
    return clientToCanvas(new P(evt.clientX, evt.clientY));
}

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    isDragging = false;

    spacetime_range = new Rect(new P(-4,-10), new P(8,80));

    var timeTranslationSlider = document.getElementById("timeTranslationSlider");
    var timeTranslation = 2 - 4 * timeTranslationSlider.value / 100.0;
    spacetime_range.p.x = -4 + timeTranslation;
    timeTranslationSlider.oninput = function() {
        var timeTranslation = 2 - 4 * timeTranslationSlider.value / 100.0;
        spacetime_range.p.x = -4 + timeTranslation;
        draw();
    }

    trajectories = [];
    trajectories.push(new Trajectory(new P(0.0, 44.1), new P(3.0, 0.0), 'rgb(255,100,100)', 'rgb(200,100,100)'));
    trajectories.push(new Trajectory(new P(-1.0, 0.0), new P(2.0, 0.0), 'rgb(0,200,0)', 'rgb(0,160,0)'));
    trajectories.push(new Trajectory(new P(-3.0, 0.0), new P(1.0, 0.0), 'rgb(100,100,255)', 'rgb(100,100,200)'));

    graphs = [];
    graphs.push(new Graph(new Rect(new P(40,440), new P(400,-400)), earth_surface_gravity));
    graphs.push(new Graph(new Rect(new P(480,440), new P(400,-400)), earth_surface_gravity/2));
    graphs.push(new Graph(new Rect(new P(920,440), new P(400,-400)), 0.0));

    var frameAccelerationSlider = document.getElementById("frameAccelerationSlider");
    graphs[1].frame_acceleration = earth_surface_gravity - earth_surface_gravity * frameAccelerationSlider.value / 100.0;
    frameAccelerationSlider.oninput = function() {
        graphs[1].frame_acceleration = earth_surface_gravity - earth_surface_gravity * this.value / 100.0;
        draw();
    }

    draw();

    canvas.addEventListener( 'mousemove',   onMouseMove, false );
    canvas.addEventListener( 'touchmove',   onTouchMove, false );

    canvas.addEventListener( 'mousedown',   onMouseDown, false );
    canvas.addEventListener( 'touchstart',  onTouchStart, false );

    canvas.addEventListener( 'mouseup',   onMouseUp, false );
    canvas.addEventListener( 'touchend',  onTouchEnd, false );
}

function draw() {
    // fill canvas with light gray
    ctx.fillStyle = 'rgb(240,240,240)';
    ctx.beginPath();
    ctx.rect(0,0,canvas.width, canvas.height);
    ctx.fill();

    // draw each graph
    for(var i = 0; i < graphs.length; i++) {
        drawSpaceTime(graphs[i]);
    }

    // label the space and time directions
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.translate(graphs[0].rect.p.x/2, graphs[0].rect.center.y);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center";
    ctx.fillText("space "+String.fromCharCode(0x2192), 0, 0);
    ctx.restore();
    ctx.fillText("time "+String.fromCharCode(0x2192), graphs[0].rect.center.x, graphs[0].rect.ymin/2);
}

function drawSpaceTime(graph) {
    ctx.save(); // save the clip region for the moment

    // fill background with white
    ctx.fillStyle = 'rgb(255,255,255)';
    ctx.beginPath();
    ctx.rect(graph.rect.p.x, graph.rect.p.y, graph.rect.size.x, graph.rect.size.y);
    ctx.fill();
    ctx.clip(); // clip to this rect until reset

    // draw minor axes
    ctx.strokeStyle = 'rgb(240,240,240)';
    var space_extra = 80; // extend space axes beyond just the minimum area
    var time_step = 1;
    var space_step = 10;
    for(var t = Math.ceil(spacetime_range.xmin); t<=Math.floor(spacetime_range.xmax); t+=time_step) {
        if(t==0.0) { continue; }
        drawAcceleratingLine(new P(t, spacetime_range.ymin-space_extra), new P(t, spacetime_range.ymax+space_extra), graph.transform.forwards);
    }
    for(var s = Math.ceil(spacetime_range.ymin-space_extra); s<=Math.floor(spacetime_range.ymax+space_extra); s+=space_step) {
        if(s==0.0) { continue; }
        drawAcceleratingLine(new P(spacetime_range.xmin, s), new P(spacetime_range.xmax, s), graph.transform.forwards);
    }
    // draw major axes
    ctx.strokeStyle = 'rgb(150,150,150)';
    drawAcceleratingLine(new P(spacetime_range.xmin, 0.0), new P(spacetime_range.xmax, 0.0), graph.transform.forwards);
    drawAcceleratingLine(new P(0.0, spacetime_range.ymin-space_extra), new P(0.0, spacetime_range.ymax+space_extra), graph.transform.forwards);

    // label axes
    ctx.fillStyle = 'rgb(100,100,100)';
    ctx.font = "13px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    var horizOffset = -0.1;
    textLabel(new P(horizOffset, 50.0), "50m", graph);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    var vertOffset = -2.0;
    for(var t = Math.ceil(spacetime_range.xmin); t<=Math.floor(spacetime_range.xmax); t+=time_step) {
        textLabel(new P(t, vertOffset), t.toFixed(0)+"s", graph);
    }

    // draw trajectories in free-fall
    ctx.lineWidth = 2;
    for(var i = 0; i < trajectories.length; i++) {
        drawGeodesic(trajectories[i], graph);
    }

    ctx.restore(); // reset the clip

    // show the frame acceleration as text
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Frame acceleration = "+graph.frame_acceleration.toFixed(1)+" ms"+String.fromCharCode(0x207B)+String.fromCharCode(0x00B2),
        graph.rect.center.x, (graph.rect.ymax+canvas.height)/2);
}

function textLabel(p, text, graph) {
    p = graph.transform.forwards(p);
    ctx.fillText(text, p.x, p.y);
}

function fromEarthSurfaceGravityAcceleratingFrameToInertialFrame(p) {
    return transformBetweenAcceleratingReferenceFrames(p, 0 - earth_surface_gravity);
}

function fromInertialFrameToEarthSurfaceGravityAcceleratingFrame(p) {
    return transformBetweenAcceleratingReferenceFrames(p, earth_surface_gravity - 0);
}

function drawGeodesic(trajectory, graph) {
    // draw a line that is straight in an inertial frame but may be not be straight in this frame, depending on its acceleration
    
    var start = fromEarthSurfaceGravityAcceleratingFrameToInertialFrame(trajectory.start);
    var end = fromEarthSurfaceGravityAcceleratingFrameToInertialFrame(trajectory.end);
    var pts = getLinePoints(start, end).map(fromInertialFrameToEarthSurfaceGravityAcceleratingFrame);
    var screen_pts = pts.map(graph.transform.forwards);
    drawLine(screen_pts, trajectory.default_color);
    drawSpacedCircles(screen_pts, trajectory.mid_size, trajectory.default_color, 10);
    // draw an arrowhead to indicate the direction of travel
    var a1 = graph.transform.forwards(fromInertialFrameToEarthSurfaceGravityAcceleratingFrame(lerp(start, end, 0.59)));
    var a2 = graph.transform.forwards(fromInertialFrameToEarthSurfaceGravityAcceleratingFrame(lerp(start, end, 0.60)));
    drawArrowHead(a1, a2, 15);
    // draw start blob
    var screen_start = graph.transform.forwards(trajectory.start);
    ctx.fillStyle = trajectory.start_color;
    ctx.beginPath();
    ctx.arc(screen_start.x, screen_start.y, trajectory.start_size, 0, 2 * Math.PI);
    ctx.fill();
    // draw end blob
    var screen_end = graph.transform.forwards(trajectory.end);
    ctx.fillStyle = trajectory.end_color;
    ctx.beginPath();
    ctx.arc(screen_end.x, screen_end.y, trajectory.end_size, 0, 2 * Math.PI);
    ctx.fill();
}

function drawAcceleratingLine(p1, p2, transform) {
    // step along the line, applying the transform function
    ctx.beginPath();
    var n_steps = 100;
    for(var i = 0; i <= n_steps; i++) {
        var u = i / n_steps;
        var ts = lerp(p1, p2, u);
        var p = transform(ts);
        if(i==0) {
            ctx.moveTo(p.x, p.y);
        }
        else {
            ctx.lineTo(p.x, p.y);
        }
    }
    ctx.stroke();
}

function transformBetweenAcceleratingReferenceFrames(ts, delta_acceleration) {
    var t_zero = spacetime_range.center.x; // central time point (e.g. t=0) gets no spatial distortion
    var time_delta = ts.x - t_zero;
    var x = ts.x;
    var y = ts.y - distanceTravelledWithConstantAcceleration(time_delta, delta_acceleration);
    return new P(x, y);
}

function findBestFitTransform(graph) {
    //var delta_acceleration = graph.frame_acceleration - earth_surface_gravity; // (use this to see everything in the specified area)
    var delta_acceleration = 0.0; // just use the transform from the earth_surface_gravity-accelerating frame, for visual clarity
    // plot some points in some arbitrary space then scale to fit the rect
    corners = [];
    corners.push(transformBetweenAcceleratingReferenceFrames(new P(spacetime_range.xmin, spacetime_range.ymin), delta_acceleration));
    corners.push(transformBetweenAcceleratingReferenceFrames(new P(spacetime_range.xmin, spacetime_range.ymax), delta_acceleration));
    corners.push(transformBetweenAcceleratingReferenceFrames(new P(spacetime_range.xmax, spacetime_range.ymin), delta_acceleration));
    corners.push(transformBetweenAcceleratingReferenceFrames(new P(spacetime_range.xmax, spacetime_range.ymax), delta_acceleration));
    corners.push(transformBetweenAcceleratingReferenceFrames(new P(spacetime_range.center.x, spacetime_range.ymin), delta_acceleration));
    corners.push(transformBetweenAcceleratingReferenceFrames(new P(spacetime_range.center.x, spacetime_range.ymax), delta_acceleration));
    original_rect = boundingRect(corners);
    return new LinearTransform2D(original_rect, graph.rect);
}

window.onload = init;
