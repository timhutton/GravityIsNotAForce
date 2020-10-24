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

var canvas;
var ctx;
var spacetime_range;

class Parabola {
    constructor(peak, color) {
        this.peak = peak;
        this.color = color;
    }
}

class Graph {
    constructor(screen_rect, transform) {
        this.screen_rect = screen_rect;
        this.transform = transform;
    }
}


function toDistanceFallenDistortedAxes(p)
{
    // return the corresponding location on the axes where the space dimension is shifted up by the distance fallen
    var time = p.x;
    var final_height = p.y;
    var time_mid = spacetime_range.center.x; // center of the current time window
    var time_diff = Math.abs(time - time_mid);
    return new P2(time, findInitialHeight(time_diff, final_height, earth_mass));
}

function fromDistanceFallenDistortedAxes(p)
{
    // return the corresponding location on the orthogonal axes given the location on the ones where the space dimension is shifted up by the distance fallen
    var time = p.x;
    var height = p.y;
    var time_mid = spacetime_range.center.x; // center of the current time window
    var time_diff = Math.abs(time - time_mid);
    return new P2(time, height - freeFallDistance(time_diff, height, earth_mass));
}

function toKleinPseudosphereAxes(p) {
    // TODO
    return p;
}

function getLinePoints(a, b) {
    var pts = [];
    var n_pts = 100;
    for(var i=0;i<=n_pts;i++) {
        var u = i / n_pts;
        pts.push(lerp(a, b, u));
    }
    return pts;
}

function getParabolaPoints(peak_time, peak_height, min_height, planet_mass) {
    var fallTime = freeFallTime(peak_height, min_height, planet_mass);
    var pts = [];
    var n_pts = 100;
    // from the left up
    for(var i=0;i<n_pts;i++) {
        var t = peak_time - fallTime + i*fallTime/n_pts;
        var h = peak_height - freeFallDistance(peak_time-t, peak_height, planet_mass);
        pts.push(new P2(t,h));
    }
    // from the top down
    for(var i=0;i<=n_pts;i++) {
        var t = peak_time + i*fallTime/n_pts;
        var h = peak_height - freeFallDistance(t - peak_time, peak_height, planet_mass);
        pts.push(new P2(t,h));
    }
    return pts;
}

// TODO: use a transform
function ptsToScreen(pts, screen_rect) {
    var new_pts = [];
    for(var i=0;i<pts.length;i++) {
        new_pts.push(new P2(screen_rect.size.x * (pts[i].x-spacetime_range.p.x)/spacetime_range.size.x + screen_rect.p.x,
                            screen_rect.size.y * (spacetime_range.p.y+spacetime_range.size.y-pts[i].y)/spacetime_range.size.y + screen_rect.p.y));
    }
    return new_pts;
}

function drawLine(pts, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for(var i=1;i<pts.length;i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
}

function drawSpacedCircles(pts, r, color) {
    ctx.fillStyle = color;
    for(var i=0;i<pts.length;i+=20) {
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, r, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function fitTimeRange(time_range_offset) {
    // pick the time range to allow for a free-fall from the max height to the min height
    var fall_time = freeFallTime(spacetime_range.ymax, spacetime_range.ymin, earth_mass);
    // time_range_offset slides the time window left and right by multiples of the existing time range
    spacetime_range.p.x = -fall_time + fall_time*time_range_offset;
    spacetime_range.size.x = fall_time * 2;
}

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    spacetime_range = new Rect( new P2(0,earth_radius), new P2(0,moon_distance-earth_radius)); // will fill in time range later
    var time_range_offset = 0;

    var heightRangeSlider = document.getElementById("heightRangeSlider");
    spacetime_range.size.y = (earth_radius+1000) + (moon_distance-(earth_radius+50)) * Math.pow(heightRangeSlider.value / 100.0, 3) - spacetime_range.p.y;
    heightRangeSlider.oninput = function() {
        spacetime_range.size.y = (earth_radius+1000) + (moon_distance-(earth_radius+50)) * Math.pow(heightRangeSlider.value / 100.0, 3) - spacetime_range.p.y;
        fitTimeRange(time_range_offset);
        draw();
    }

    var timeTranslationSlider = document.getElementById("timeTranslationSlider");
    time_range_offset = 1-2*timeTranslationSlider.value / 100.0;
    timeTranslationSlider.oninput = function() {
        var time_range_offset = 1-2*timeTranslationSlider.value / 100.0;
        fitTimeRange(time_range_offset);
        draw();
    }

    fitTimeRange(time_range_offset);

    draw();
}

function draw() {
    // fill canvas with light gray
    ctx.fillStyle = 'rgb(240,240,240)';
    ctx.beginPath();
    ctx.rect(0,0,canvas.width, canvas.height);
    ctx.fill();

    var graphs = [ new Graph( new Rect( new P2(40,50), new P2(600,400)), p => { return p; }),
                   new Graph( new Rect( new P2(760,50), new P2(600,400)), toDistanceFallenDistortedAxes), // attempt to use a simple time-of-fall mapping
                   //new Graph( new Rect( new P2(760,50), new P2(600,400)), toKleinPseudosphereAxes), // attempt to use a pseudosphere drawn in Klein's disk model
                   ];
    var x_axis = getLinePoints(spacetime_range.min, new P2(spacetime_range.xmax, spacetime_range.ymin));
    var y_axis = getLinePoints(new P2(0,spacetime_range.ymin), new P2(0,spacetime_range.ymax));
    var fall_time = freeFallTime(spacetime_range.ymax, spacetime_range.ymin, earth_mass);
    var parabolas = [new Parabola(new P2(-0.2*fall_time, spacetime_range.ymin+spacetime_range.size.y*0.75), 'rgb(100,100,200)'),
                     new Parabola(new P2( 0.1*fall_time, spacetime_range.ymin+spacetime_range.size.y*0.45), 'rgb(200,100,100)'),
                     new Parabola(new P2( 0.2*fall_time, spacetime_range.ymin+spacetime_range.size.y*0.32), 'rgb(200,100,200)'),
                     new Parabola(new P2( 0.4*fall_time, spacetime_range.ymin+spacetime_range.size.y*0.32), 'rgb(100,200,100)')];
    for(var i=0;i<=10;i++) {
        parabolas.push( new Parabola(new P2(0, spacetime_range.ymin+i*spacetime_range.size.y/10.0), 'rgb(150,150,150)') );
    }

    // draw the graphs
    graphs.forEach(graph => {
        ctx.save(); // save the original clip for now

        // fill background with white
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.beginPath();
        ctx.rect(graph.screen_rect.xmin, graph.screen_rect.ymin, graph.screen_rect.size.x, graph.screen_rect.size.y);
        ctx.fill();
        ctx.clip(); // clip to this rect until restored

        // draw axes
        var x_axis_transformed = transformPoints(x_axis, graph.transform);
        var y_axis_transformed = transformPoints(y_axis, graph.transform);
        x_axis_transformed = ptsToScreen(x_axis_transformed, graph.screen_rect);
        y_axis_transformed = ptsToScreen(y_axis_transformed, graph.screen_rect);
        var axes_color = 'rgb(50,50,50)';
        drawLine(x_axis_transformed, axes_color);
        drawLine(y_axis_transformed, axes_color);

        // draw some parabolas
        parabolas.forEach(parabola => {
            var pts = getParabolaPoints(parabola.peak.x, parabola.peak.y, spacetime_range.p.y, earth_mass);
            pts = transformPoints(pts, graph.transform);
            pts = ptsToScreen(pts, graph.screen_rect);
            drawLine(pts, parabola.color);
            drawSpacedCircles(pts, 1.5, parabola.color);
        });

        ctx.restore(); // restore the original clip
    });

    // show the height range as text next to the first graph
    var screen_rect = graphs[0].screen_rect;
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Earth surface", screen_rect.center.x, (screen_rect.ymax+canvas.height)/2);
    ctx.fillText((spacetime_range.size.y/1000).toFixed(0)+"km above Earth surface", screen_rect.center.x, screen_rect.p.y/2);

    var circ = circle(pos(0,0),1);
}

window.onload = init;
