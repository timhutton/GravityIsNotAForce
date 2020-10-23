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

function toDistortedAxes(time, final_height)
{
    // return the corresponding location on the distorted axes
    return pos(time, findInitialHeight(Math.abs(time), final_height, earth_mass));
}

function toStandardAxes(time, height)
{
    // return the corresponding location on the orthogonal axes
    return pos(time, height - freeFallDistance(Math.abs(time), height, earth_mass));
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
        pts.push(pos(t,h));
    }
    // from the top down
    for(var i=0;i<=n_pts;i++) {
        var t = peak_time + i*fallTime/n_pts;
        var h = peak_height - freeFallDistance(t - peak_time, peak_height, planet_mass);
        pts.push(pos(t,h));
    }
    return pts;
}

function ptsToDistortedAxes(pts) {
    var new_pts = [];
    for(var i=0;i<pts.length;i++) {
        new_pts.push(toDistortedAxes(pts[i].x, pts[i].y));
    }
    return new_pts;
}

function ptsToScreen(pts, min_height, max_height, min_time, max_time, size, x_offset, y_offset) {
    var new_pts = [];
    for(var i=0;i<pts.length;i++) {
        new_pts.push(pos(size * (pts[i].x-min_time)/(max_time-min_time) + x_offset, size * (max_height-pts[i].y)/(max_height-min_height) + y_offset));
    }
    return new_pts;
}

function drawLine(pts, color='rgb(0,0,0)') {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for(var i=1;i<pts.length;i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
}

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    draw();
}

function draw() {
    var h1 = moon_distance;
    //var h1 = earth_radius*4;
    //var h1 = earth_radius+5000000;
    //var h1 = earth_radius+50;
    var h2 = earth_radius;
    var fall_time = freeFallTime(h1, h2, earth_mass);
    var size = 400;
    var x_offsets = [ 10, 10 + size + 250 ];
    var y_offset = 10;

    // draw axes
    var x_axis = getLinePoints(pos(-fall_time,h2),pos(fall_time,h2));
    var y_axis = getLinePoints(pos(0,h2),pos(0,h1));
    var x1 = ptsToScreen(x_axis, h2, h1, 0, fall_time, size, x_offsets[0], y_offset);
    var y1 = ptsToScreen(y_axis, h2, h1, 0, fall_time, size, x_offsets[0], y_offset);
    drawLine(x1, 'rgb(150,150,150)');
    drawLine(y1, 'rgb(150,150,150)');
    var x2 = ptsToScreen(ptsToDistortedAxes(x_axis), h2, h1, 0, fall_time, size, x_offsets[1], y_offset);
    var y2 = ptsToScreen(ptsToDistortedAxes(y_axis), h2, h1, 0, fall_time, size, x_offsets[1], y_offset);
    drawLine(x2, 'rgb(150,150,150)');
    drawLine(y2, 'rgb(150,150,150)');

    // draw some parabolas that peak at t=0
    var heights = [];
    for(var i=0;i<=10;i++) {
        heights.push(h1+i*(h2-h1)/10.0);
    }
    heights.forEach(initial_height => {
        var pts = getParabolaPoints(0, initial_height, h2, earth_mass);
        var pts1 = ptsToScreen(pts, h2, h1, 0, fall_time, size, x_offsets[0], y_offset);
        drawLine(pts1, 'rgb(0,0,0)'); // black: free-fall trajectories starting at t=0 on standard axes
        var pts2 = ptsToDistortedAxes(pts);
        pts2 = ptsToScreen(pts2, h2, h1, 0, fall_time, size, x_offsets[1], y_offset);
        drawLine(pts2, 'rgb(100,200,100)'); // green: trajectories on distorted axes
    });

    // draw some other parabolas
    var pts = getParabolaPoints(fall_time/4, h1+(h2-h1)*0.45, h2, earth_mass);
    var pts1 = ptsToScreen(pts, h2, h1, 0, fall_time, size, x_offsets[0], y_offset);
    drawLine(pts1, 'rgb(200,100,100)'); // red: new parabola on standard axes
    var pts2 = ptsToDistortedAxes(pts);
    pts2 = ptsToScreen(pts2, h2, h1, 0, fall_time, size, x_offsets[1], y_offset);
    drawLine(pts2, 'rgb(200,100,200)'); // purple: new parabola on distorted axes
}

window.onload = init;
