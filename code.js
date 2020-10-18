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
var g;
var time_range;
var space_range;
var isDragging;
var dragTrajectory;
var dragIsStart;

// classes:

function pos(x, y) {
    return { x:x, y:y };
}

function rect(x, y, width, height) {
    return { x:x, y:y, width:width, height:height };
}

function range(min, max, step=1.0) {
    return { min:min, max:max, step:step };
}

function trajectory(start, end, color, hover_color) {
    var default_start_size = 6.0;
    var default_end_size = 4.0;
    var mid_size = 2.0;
    var hover_size = 10.0;
    return { start:start, end:end, default_color:color,
        start_size:default_start_size, end_size:default_end_size, mid_size:mid_size,
        start_color:color, end_color:color,
        default_start_size:default_start_size, default_end_size:default_end_size,
        hover_size:hover_size, hover_color:hover_color };
}

function graph(rect, frame_acceleration) {
    var graph = {rect:rect, frame_acceleration:frame_acceleration};
    graph.transform = findBestFitTransform(graph);
    return graph;
}

function linearTransform(mult_x, offset_x, mult_y, offset_y) {
    return { mult_x:mult_x, offset_x:offset_x, mult_y:mult_y, offset_y:offset_y };
}

// functions:

function dist(a, b) {
    return Math.sqrt((a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y));
}

function lerp(a, b, u) {
    return pos(a.x + u*(b.x-a.x), a.y + u*(b.y-a.y));
}

function moveTo(p) {
    ctx.moveTo(p.x, p.y);
}

function lineTo(p) {
    ctx.lineTo(p.x, p.y);
}

// adapted from http://stackoverflow.com/a/6333775/126823
function drawArrowHead( a, b, size ) {
    var angle = Math.atan2(b.y-a.y,b.x-a.x);
    ctx.beginPath();
    ctx.moveTo(b.x - size * Math.cos(angle - Math.PI/6), b.y - size * Math.sin(angle - Math.PI/6));
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(b.x - size * Math.cos(angle + Math.PI/6), b.y - size * Math.sin(angle + Math.PI/6));
    ctx.stroke();
}

function applyLinearTransform(p, transform) {
    return pos(transform.offset_x + transform.mult_x * p.x, transform.offset_y + transform.mult_y * p.y);
}

function applyLinearTransformInverse(p, transform) {
    return pos((p.x - transform.offset_x) / transform.mult_x, (p.y - transform.offset_y) / transform.mult_y);
}

function computeLinearTransform(from_rect, to_rect) {
    mult_x = to_rect.width / from_rect.width;
    offset_x = to_rect.x - mult_x * from_rect.x;
    mult_y = to_rect.height / from_rect.height;
    offset_y = to_rect.y - mult_y * from_rect.y;
    return linearTransform(mult_x, offset_x, mult_y, offset_y);
}

function boundingRect(points) {
    var left = Number.MAX_VALUE;
    var right = -Number.MAX_VALUE;
    var top = Number.MAX_VALUE;
    var bottom = -Number.MAX_VALUE;
    for(var i = 0; i < points.length; i++) {
        left = Math.min(left, points[i].x);
        right = Math.max(right, points[i].x);
        top = Math.min(top, points[i].y);
        bottom = Math.max(bottom, points[i].y);
    }
    return rect(left, top, right-left, bottom-top);
}

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
            if( pointInRect(p, graphs[i].rect) ) {
                // convert p to the coordinate system of this graph
                var delta_acceleration = g - graphs[i].frame_acceleration
                p = applyLinearTransformInverse(p, graphs[i].transform);
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
            if( pointInRect(p, graphs[i].rect) ) {
                var delta_acceleration = graphs[i].frame_acceleration - g;
                for(var j = 0; j < trajectories.length; j++) {
                    // start?
                    var m = applyLinearTransform(transformBetweenAcceleratingReferenceFrames(trajectories[j].start, delta_acceleration), graphs[i].transform);
                    var d = dist(p, m);
                    if( d < hover_radius && d < d_min) {
                        d_min = d;
                        isHovering = true;
                        whichTrajectory = j;
                        isStart = true;
                    }
                    // end?
                    m = applyLinearTransform(transformBetweenAcceleratingReferenceFrames(trajectories[j].end, delta_acceleration), graphs[i].transform);
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
        if( pointInRect(p, graphs[i].rect) ) {
            var delta_acceleration = graphs[i].frame_acceleration - g;
            for(var j = 0; j < trajectories.length; j++) {
                // start?
                var m = applyLinearTransform(transformBetweenAcceleratingReferenceFrames(trajectories[j].start, delta_acceleration), graphs[i].transform);
                var d = dist(p, m);
                if( d < grab_radius && d < d_min) {
                    d_min = d;
                    isDragging = true;
                    dragTrajectory = j;
                    dragIsStart = true;
                }
                // end?
                m = applyLinearTransform(transformBetweenAcceleratingReferenceFrames(trajectories[j].end, delta_acceleration), graphs[i].transform);
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
    return pos( clientPos.x - rect.left, clientPos.y - rect.top );
}

function getMousePos(evt) {
    var rect = canvas.getBoundingClientRect();
    return pos( evt.clientX - rect.left, evt.clientY - rect.top );
}

function pointInRect( p, rect ) {
    var left = Math.min(rect.x, rect.x + rect.width);
    var right = Math.max(rect.x, rect.x + rect.width);
    var top = Math.min(rect.y, rect.y + rect.height);
    var bottom = Math.max(rect.y, rect.y + rect.height);
    return p.x > left && p.x < right && p.y > top && p.y < bottom;
}

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    isDragging = false;

    g = 9.8; // metres per second per second

    var timeTranslationSlider = document.getElementById("timeTranslationSlider");
    var timeTranslation = 2 - 4 * timeTranslationSlider.value / 100.0;
    time_range = range(-4 + timeTranslation, 4 + timeTranslation, 1);
    timeTranslationSlider.oninput = function() {
        var timeTranslation = 2 - 4 * timeTranslationSlider.value / 100.0;
        time_range = range(-4 + timeTranslation, 4 + timeTranslation, 1);
        for(var i = 0; i < graphs.length; i++) {
            graphs[i].transform = findBestFitTransform(graphs[i]);
        }
        draw();
    }

    space_range = range(-10, 70, 10);

    trajectories = [];
    trajectories.push(trajectory(pos(0.0, 44.1), pos(3.0, 0.0), 'rgb(255,100,100)', 'rgb(200,100,100)'));
    trajectories.push(trajectory(pos(-1.0, 0.0), pos(2.0, 0.0), 'rgb(0,200,0)', 'rgb(0,160,0)'));
    trajectories.push(trajectory(pos(-3.0, 0.0), pos(1.0, 0.0), 'rgb(100,100,255)', 'rgb(100,100,200)'));

    graphs = [];
    graphs.push(graph(rect(40,440,400,-400), g));
    graphs.push(graph(rect(480,440,400,-400), g/2));
    graphs.push(graph(rect(920,440,400,-400), 0.0));

    var frameAccelerationSlider = document.getElementById("frameAccelerationSlider");
    graphs[1].frame_acceleration = g - g * frameAccelerationSlider.value / 100.0;
    frameAccelerationSlider.oninput = function() {
        graphs[1].frame_acceleration = g - g * this.value / 100.0;
        graphs[1].transform = findBestFitTransform(graphs[1]);
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
    ctx.translate(graphs[0].rect.x/2, graphs[0].rect.y + graphs[0].rect.height/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center";
    ctx.fillText("space "+String.fromCharCode(0x2192), 0, 0);
    ctx.restore();
    ctx.fillText("time "+String.fromCharCode(0x2192), graphs[0].rect.x + graphs[0].rect.width/2, (graphs[0].rect.y+graphs[0].rect.height)/2);
}

function drawSpaceTime(graph) {
    ctx.save(); // save the clip region for the moment

    // fill background with white
    ctx.fillStyle = 'rgb(255,255,255)';
    ctx.beginPath();
    ctx.rect(graph.rect.x, graph.rect.y, graph.rect.width, graph.rect.height);
    ctx.fill();
    ctx.clip(); // clip to this rect until reset

    // draw minor axes
    ctx.strokeStyle = 'rgb(240,240,240)';
    var space_extra = 80; // extend space axes beyond just the minimum area
    for(var t = Math.ceil(time_range.min); t<=Math.floor(time_range.max); t+=time_range.step) {
        if(t==0.0) { continue; }
        drawCurvingLine(pos(t, space_range.min-space_extra), pos(t, space_range.max+space_extra), graph);
    }
    for(var s = Math.ceil(space_range.min-space_extra); s<=Math.floor(space_range.max+space_extra); s+=space_range.step) {
        if(s==0.0) { continue; }
        drawCurvingLine(pos(time_range.min, s), pos(time_range.max, s), graph);
    }
    // draw major axes
    ctx.strokeStyle = 'rgb(150,150,150)';
    drawCurvingLine(pos(time_range.min, 0.0), pos(time_range.max, 0.0), graph);
    drawCurvingLine(pos(0.0, space_range.min-space_extra), pos(0.0, space_range.max+space_extra), graph);

    // label axes
    ctx.fillStyle = 'rgb(100,100,100)';
    ctx.font = "13px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    var horizOffset = -0.1;
    textLabel(pos(horizOffset, 50.0), "50m", graph);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    var vertOffset = -2.0;
    for(var t = Math.ceil(time_range.min); t<=Math.floor(time_range.max); t+=time_range.step) {
        textLabel(pos(t, vertOffset), t.toFixed(0)+"s", graph);
    }

    // draw trajectories in free-fall
    for(var i = 0; i < trajectories.length; i++) {
        ctx.lineWidth = 2;
        drawGeodesic(trajectories[i], graph);
    }

    ctx.restore(); // reset the clip

    // show the frame acceleration as text
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Frame acceleration = "+graph.frame_acceleration.toFixed(1)+" ms"+String.fromCharCode(0x207B)+String.fromCharCode(0x00B2),
        graph.rect.x+graph.rect.width/2, (graph.rect.y+canvas.height)/2);
}

function textLabel(p, text, graph) {
    var delta_acceleration = graph.frame_acceleration - g;
    p = applyLinearTransform(transformBetweenAcceleratingReferenceFrames(p, delta_acceleration), graph.transform);
    ctx.fillText(text, p.x, p.y);
}

function drawCurvingLine(p1, p2, graph) {
    // draw a line that is straight in our familiar (accelerating upwards at g) reference frame but may not be straight in this frame, depending on its acceleration
    var delta_acceleration = graph.frame_acceleration - g;
    drawLine(p1, p2, delta_acceleration, graph.transform);
}

function drawGeodesic(trajectory, graph) {
    // draw a line that is straight in an inertial frame but may be not be straight in this frame, depending on its acceleration

    ctx.strokeStyle = trajectory.default_color;
    // convert spacetime coordinates from our familiar (g-accelerating) frame into the inertial frame
    var delta_acceleration = 0.0 - g;
    var start = transformBetweenAcceleratingReferenceFrames(trajectory.start, delta_acceleration)
    var end = transformBetweenAcceleratingReferenceFrames(trajectory.end, delta_acceleration)
    // step along that line, converting to the target frame
    delta_acceleration = graph.frame_acceleration - 0.0;
    drawLine(start, end, delta_acceleration, graph.transform);
    // draw an arrowhead to indicate the direction of travel
    var a1 = applyLinearTransform(transformBetweenAcceleratingReferenceFrames(lerp(start, end, 0.59), delta_acceleration), graph.transform);
    var a2 = applyLinearTransform(transformBetweenAcceleratingReferenceFrames(lerp(start, end, 0.60), delta_acceleration), graph.transform);
    drawArrowHead(a1, a2, 15);
    // draw circles along the way
    var n_steps = 10;
    for(var i = 0; i <= n_steps; i++) {
        var u = i / n_steps;
        var c = lerp(start, end, u);
        c = applyLinearTransform(transformBetweenAcceleratingReferenceFrames(c, delta_acceleration), graph.transform);
        ctx.beginPath();
        var r = trajectory.mid_size;
        ctx.fillStyle = trajectory.default_color;
        if(i==0) {
            r = trajectory.start_size;
            ctx.fillStyle = trajectory.start_color;
        } else if(i==n_steps) {
            r = trajectory.end_size;
            ctx.fillStyle = trajectory.end_color;
        }
        ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function drawLine(p1, p2, delta_acceleration, transform) {
    // step along the line, converting to the target frame
    ctx.beginPath();
    var n_steps = 100;
    for(var i = 0; i <= n_steps; i++) {
        var u = i / n_steps;
        var ts = lerp(p1, p2, u);
        var p = applyLinearTransform(transformBetweenAcceleratingReferenceFrames(ts, delta_acceleration), transform);
        if(i==0) {
            moveTo(p);
        }
        else {
            lineTo(p);
        }
    }
    ctx.stroke();
}

function transformBetweenAcceleratingReferenceFrames(ts, delta_acceleration) {
    var t_zero = (time_range.min+time_range.max)/2; // central time point (e.g. t=0) gets no spatial distortion
    var time_delta = ts.x - t_zero;
    var x = ts.x;
    var y = ts.y - distanceTravelled(time_delta, delta_acceleration);
    return pos(x, y);
}

function findBestFitTransform(graph) {
    //var delta_acceleration = graph.frame_acceleration - g; // (use this to see everything in the specified area)
    var delta_acceleration = 0.0; // just use the transform from the g-accelerating frame, for visual clarity
    // plot some points in some arbitrary space then scale to fit the rect
    corners = [];
    corners.push(transformBetweenAcceleratingReferenceFrames(pos(time_range.min, space_range.min), delta_acceleration));
    corners.push(transformBetweenAcceleratingReferenceFrames(pos(time_range.min, space_range.max), delta_acceleration));
    corners.push(transformBetweenAcceleratingReferenceFrames(pos(time_range.max, space_range.min), delta_acceleration));
    corners.push(transformBetweenAcceleratingReferenceFrames(pos(time_range.max, space_range.max), delta_acceleration));
    corners.push(transformBetweenAcceleratingReferenceFrames(pos((time_range.min+time_range.max)/2, space_range.min), delta_acceleration));
    corners.push(transformBetweenAcceleratingReferenceFrames(pos((time_range.min+time_range.max)/2, space_range.max), delta_acceleration));
    original_rect = boundingRect(corners);
    return computeLinearTransform(original_rect, graph.rect);
}

function distanceTravelled(time, acceleration) {
    return 0.5 * acceleration * time * time;
}

window.onload = init;
