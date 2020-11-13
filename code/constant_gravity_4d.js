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
var dragEnd;
var view_angle;

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    isDragging = false;

    spacetime_range = new Rect(new P(-4,-10), new P(8,70));

    var timeTranslationSlider = document.getElementById("timeTranslationSlider");
    var timeTranslation = 2 - 4 * timeTranslationSlider.value / 100.0;
    spacetime_range.p.x = -4 + timeTranslation;
    timeTranslationSlider.oninput = function() {
        var timeTranslation = 2 - 4 * timeTranslationSlider.value / 100.0;
        spacetime_range.p.x = -4 + timeTranslation;
        draw();
    }

    var viewAngleSlider = document.getElementById("viewAngleSlider");
    view_angle = 2 * Math.PI * viewAngleSlider.value / 100.0;
    viewAngleSlider.oninput = function() {
        view_angle = 2 * Math.PI * viewAngleSlider.value / 100.0;
        draw();
    }

    // coordinates: time, space1=up, space2, space3
    trajectories = [];
    trajectories.push(new Trajectory(new P(0, 44.1, 20, 10), new P(3, 0, 20, 10), 'rgb(255,100,100)', 'rgb(200,100,100)')); // red
    trajectories.push(new Trajectory(new P(-1, 0, 5, 20), new P(2, 0, 45, 40), 'rgb(0,200,0)', 'rgb(0,160,0)')); // green
    trajectories.push(new Trajectory(new P(-3, 0, 56, 65), new P(1, 0, 9, -20), 'rgb(100,100,255)', 'rgb(100,100,200)')); // blue
    
    var margin = 50;
    var size = 400;
    var rects = [new Rect(new P(margin,size+margin), new P(size,-size)),
                 new Rect(new P(margin+(size+margin)*1,size+margin), new P(size,-size)),
                 new Rect(new P(margin+(size+margin)*2,size+margin), new P(size,-size)),
                 new Rect(new P(margin,(size+margin)*2), new P(size,-size)),
                 new Rect(new P(margin+(size+margin)*1,(size+margin)*2), new P(size,-size)),
                 new Rect(new P(margin+(size+margin)*2,(size+margin)*2), new P(size,-size))];

    graphs = [];
    /*graphs.push(new GraphT1S1(rects[0], earth_surface_gravity, "time "+rightArrow, "space 1 "+rightArrow));
    graphs.push(new GraphT1S1(rects[1], 0, "time "+rightArrow, "space 1 & time "+rightArrow));
    graphs.push(new GraphS3(  rects[2], 0, "space 1 + space 2 + space 3", "space 1 & time "+rightArrow));
    graphs.push(new GraphS2(  rects[3], 0, "space 2 "+rightArrow, "space 1 & time "+rightArrow));
    graphs.push(new GraphT1S2(rects[4], 0, "time + space 1 + space 2", ""));
    graphs.push(new GraphT1S3(rects[5], 0, "time + space 1 + space 2 + space 3", ""));*/
    graphs.push(new GraphS3(  rects[0], 0, "space 1 + space 2 + space 3", "space 1 & time "+rightArrow));
    graphs.push(new GraphT1S2(rects[1], 0, "time + space 1 + space 2", ""));
    graphs.push(new GraphT1S3(rects[2], 0, "time + space 1 + space 2 + space 3", ""));

    var frameAccelerationSlider = document.getElementById("frameAccelerationSlider");
    var acc = earth_surface_gravity - earth_surface_gravity * frameAccelerationSlider.value / 100.0;
    /*graphs[1].frame_acceleration = acc;
    graphs[2].frame_acceleration = acc;
    graphs[3].frame_acceleration = acc;
    graphs[4].frame_acceleration = acc;
    graphs[5].frame_acceleration = acc;*/
    graphs.forEach(graph => { graph.frame_acceleration = acc; });
    frameAccelerationSlider.oninput = function() {
        var acc = earth_surface_gravity - earth_surface_gravity * this.value / 100.0;
        /*graphs[1].frame_acceleration = acc;
        graphs[2].frame_acceleration = acc;
        graphs[3].frame_acceleration = acc;
        graphs[4].frame_acceleration = acc;
        graphs[5].frame_acceleration = acc;*/
        graphs.forEach(graph => { graph.frame_acceleration = acc; });
        draw();
    }

    draw();
}

function draw() {
    // fill canvas with light gray
    ctx.fillStyle = 'rgb(240,240,240)';
    ctx.beginPath();
    ctx.rect(0,0,canvas.width, canvas.height);
    ctx.fill();

    // draw each graph
    graphs.forEach( graph => {
        drawSpaceTime(graph);
    });
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
    var space_extra = 20; // extend space axes beyond just the minimum area
    var time_step = 1;
    var space_step = 10;
    var space_min = spacetime_range.ymin-space_extra;
    var space_max = spacetime_range.ymax+space_extra;
    var time_min = spacetime_range.xmin;
    var time_max = spacetime_range.xmax;
    var time_mid = spacetime_range.center.x;
    for(var t = Math.ceil(time_min); t<=Math.floor(time_max); t+=time_step) {
        if(t==0.0) { continue; }
        drawLine(getLinePoints(new P(t, space_min, 0, 0), new P(t, space_max, 0, 0)).map(graph.transform.forwards)); // YX
    }
    for(var s = Math.ceil(space_min); s<=Math.floor(space_max); s+=space_step) {
        if(s==0.0) { continue; }
        drawLine(getLinePoints(new P(time_min, s, 0, 0), new P(time_max, s, 0, 0)).map(graph.transform.forwards)); // XY
        drawLine(getLinePoints(new P(0, space_min, s, 0), new P(0, space_max, s, 0)).map(graph.transform.forwards)); // YZ
        drawLine(getLinePoints(new P(0, s, space_min, 0), new P(0, s, space_max, 0)).map(graph.transform.forwards)); // ZY
        drawLine(getLinePoints(new P(0, space_min, 0, s), new P(0, space_max, 0, s)).map(graph.transform.forwards)); // YW
        drawLine(getLinePoints(new P(0, s, 0, space_min), new P(0, s, 0, space_max)).map(graph.transform.forwards)); // WY
    }
    // draw major axes
    ctx.strokeStyle = 'rgb(150,150,150)';
    drawLine(getLinePoints(new P(time_min, 0, 0, 0), new P(time_max, 0, 0, 0)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(0, space_min, 0, 0), new P(0, space_max, 0, 0)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(0, 0, space_min, 0), new P(0, 0, space_max, 0)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(0, 0, 0, space_min), new P(0, 0, 0, space_max)).map(graph.transform.forwards));
    // draw bounds
    ctx.strokeStyle = 'rgb(100,100,100)';
    // x=time directions
    /*drawLine(getLinePoints(new P(time_min, space_min, space_min, space_min), new P(time_max, space_min, space_min, space_min)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_min, space_max, space_min, space_min), new P(time_max, space_max, space_min, space_min)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_min, space_min, space_max, space_min), new P(time_max, space_min, space_max, space_min)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_min, space_min, space_min, space_max), new P(time_max, space_min, space_min, space_max)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_min, space_max, space_max, space_min), new P(time_max, space_max, space_max, space_min)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_min, space_min, space_max, space_max), new P(time_max, space_min, space_max, space_max)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_min, space_max, space_min, space_max), new P(time_max, space_max, space_min, space_max)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_min, space_max, space_max, space_max), new P(time_max, space_max, space_max, space_max)).map(graph.transform.forwards));*/
    // y=space1 directions
    drawLine(getLinePoints(new P(time_mid, space_min, space_min, space_min), new P(time_mid, space_max, space_min, space_min)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_mid, space_min, space_min, space_max), new P(time_mid, space_max, space_min, space_max)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_mid, space_min, space_max, space_min), new P(time_mid, space_max, space_max, space_min)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_mid, space_min, space_max, space_max), new P(time_mid, space_max, space_max, space_max)).map(graph.transform.forwards));
    // z=space2 directions
    drawLine(getLinePoints(new P(time_mid, space_min, space_min, space_min), new P(time_mid, space_min, space_max, space_min)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_mid, space_min, space_min, space_max), new P(time_mid, space_min, space_max, space_max)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_mid, space_max, space_min, space_min), new P(time_mid, space_max, space_max, space_min)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_mid, space_max, space_min, space_max), new P(time_mid, space_max, space_max, space_max)).map(graph.transform.forwards));
    // w=space3 directions
    drawLine(getLinePoints(new P(time_mid, space_min, space_min, space_min), new P(time_mid, space_min, space_min, space_max)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_mid, space_min, space_max, space_min), new P(time_mid, space_min, space_max, space_max)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_mid, space_max, space_min, space_min), new P(time_mid, space_max, space_min, space_max)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(time_mid, space_max, space_max, space_min), new P(time_mid, space_max, space_max, space_max)).map(graph.transform.forwards));

    // axes markers
    ctx.fillStyle = 'rgb(100,100,100)';
    ctx.font = "13px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    var horizOffset = -0.1;
    drawText(graph.transform.forwards(new P(horizOffset, 50, 0, 0)), "50m");
    drawText(graph.transform.forwards(new P(0, horizOffset, 50, 0)), "50m");
    drawText(graph.transform.forwards(new P(0, horizOffset, 0, 50)), "50m");
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    var vertOffset = -2.0;
    for(var t = Math.ceil(spacetime_range.xmin); t<=Math.floor(spacetime_range.xmax); t+=time_step) {
        drawText(graph.transform.forwards(new P(t, vertOffset)), t.toFixed(0)+"s");
    }

    // draw trajectories in free-fall
    trajectories.forEach( trajectory => {
        drawGeodesic(trajectory, graph);
    });

    // show the frame acceleration as text
    ctx.fillStyle = 'rgb(100,100,100)';
    ctx.font = "16px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Frame acceleration = "+graph.frame_acceleration.toFixed(1)+" ms"+sup_minus2,
        graph.rect.xmin + 15, graph.rect.ymax - 15);

    ctx.restore(); // reset the clip

    // label the axes directions
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.translate(graph.rect.xmin - 15, graph.rect.center.y);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center";
    ctx.fillText(graph.left_text, 0, 0);
    ctx.restore();
    ctx.fillText(graph.top_text, graph.rect.center.x, graph.rect.ymin - 15);
}

window.onload = init;
