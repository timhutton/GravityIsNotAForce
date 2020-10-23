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

function ptsToScreen(pts, height_range, time_range, screen_rect) {
    var new_pts = [];
    for(var i=0;i<pts.length;i++) {
        new_pts.push(pos(screen_rect.width * (pts[i].x-time_range.min)/(time_range.max-time_range.min) + screen_rect.x,
                         screen_rect.height * (height_range.max-pts[i].y)/(height_range.max-height_range.min) + screen_rect.y));
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
    var height_range = range(earth_radius, moon_distance);
    var fall_time = freeFallTime(height_range.max, height_range.min, earth_mass);
    var time_range = range(-fall_time/4, fall_time); 
    var screen_rects = [ rect(10,10,400,400), rect(660,10,400,400) ];

    // draw axes
    var x_axis = getLinePoints(pos(time_range.min,height_range.min),pos(time_range.max,height_range.min));
    var y_axis = getLinePoints(pos(0,height_range.min),pos(0,height_range.max));
    var x1 = ptsToScreen(x_axis, height_range, time_range, screen_rects[0]);
    var y1 = ptsToScreen(y_axis, height_range, time_range, screen_rects[0]);
    drawLine(x1, 'rgb(150,150,150)');
    drawLine(y1, 'rgb(150,150,150)');
    var x2 = ptsToScreen(ptsToDistortedAxes(x_axis), height_range, time_range, screen_rects[1]);
    var y2 = ptsToScreen(ptsToDistortedAxes(y_axis), height_range, time_range, screen_rects[1]);
    drawLine(x2, 'rgb(150,150,150)');
    drawLine(y2, 'rgb(150,150,150)');

    // draw some parabolas that peak at t=0
    var heights = [];
    for(var i=0;i<=10;i++) {
        heights.push(height_range.min+i*(height_range.max-height_range.min)/10.0);
    }
    heights.forEach(initial_height => {
        var pts = getParabolaPoints(0, initial_height, height_range.min, earth_mass);
        var pts1 = ptsToScreen(pts, height_range, time_range, screen_rects[0]);
        drawLine(pts1, 'rgb(0,0,0)'); // black: free-fall trajectories starting at t=0 on standard axes
        var pts2 = ptsToDistortedAxes(pts);
        pts2 = ptsToScreen(pts2, height_range, time_range, screen_rects[1]);
        drawLine(pts2, 'rgb(100,200,100)'); // green: trajectories on distorted axes
    });

    // draw some other parabolas
    var pts = getParabolaPoints(fall_time/4, height_range.min+(height_range.max-height_range.min)*0.45, height_range.min, earth_mass);
    var pts1 = ptsToScreen(pts, height_range, time_range, screen_rects[0]);
    drawLine(pts1, 'rgb(200,100,100)'); // red: new parabola on standard axes
    var pts2 = ptsToDistortedAxes(pts);
    pts2 = ptsToScreen(pts2, height_range, time_range, screen_rects[1]);
    drawLine(pts2, 'rgb(200,100,200)'); // purple: new parabola on distorted axes
}

window.onload = init;
