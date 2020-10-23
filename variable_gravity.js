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
var height_range;
var time_range;

function parabola(peak, color) {
    return { peak:peak, color:color };
}

function toDistortedAxes(time, final_height)
{
    // return the corresponding location on the distorted axes
    var time_diff = Math.abs(time - (time_range.max+time_range.min)/2);
    return pos(time, findInitialHeight(time_diff, final_height, earth_mass));
}

function toStandardAxes(time, height)
{
    // return the corresponding location on the orthogonal axes
    var time_diff = Math.abs(time - (time_range.max+time_range.min)/2);
    return pos(time, height - freeFallDistance(time_diff, height, earth_mass));
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
    var fall_time = freeFallTime(height_range.max, height_range.min, earth_mass);
    time_range = range(-fall_time + fall_time*time_range_offset, fall_time + fall_time*time_range_offset);
}

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    height_range = range(earth_radius, moon_distance);
    var time_range_offset = 0;
    fitTimeRange(time_range_offset);

    var heightRangeSlider = document.getElementById("heightRangeSlider");
    height_range.max = (earth_radius+50) + (moon_distance-(earth_radius+50)) * Math.pow(heightRangeSlider.value / 100.0, 3);
    fitTimeRange(time_range_offset);
    heightRangeSlider.oninput = function() {
        height_range.max = (earth_radius+50) + (moon_distance-(earth_radius+50)) * Math.pow(heightRangeSlider.value / 100.0, 3);
        fitTimeRange(time_range_offset);
        draw();
    }

    var timeTranslationSlider = document.getElementById("timeTranslationSlider");
    time_range_offset = 1-2*timeTranslationSlider.value / 100.0;
    fitTimeRange(time_range_offset);
    timeTranslationSlider.oninput = function() {
        time_range_offset = 1-2*timeTranslationSlider.value / 100.0;
        fitTimeRange(time_range_offset);
        draw();
    }

    draw();
}

function draw() {
    var screen_rects = [ rect(10,10,600,400), rect(760,10,600,400) ];

    // fill canvas with light gray
    ctx.fillStyle = 'rgb(240,240,240)';
    ctx.beginPath();
    ctx.rect(0,0,canvas.width, canvas.height);
    ctx.fill();

    // fill background with white
    screen_rects.forEach(screen_rect => {
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.beginPath();
        ctx.rect(screen_rect.x, screen_rect.y, screen_rect.width, screen_rect.height);
        ctx.fill();
    });

    // draw axes
    var x_axis = getLinePoints(pos(time_range.min,height_range.min),pos(time_range.max,height_range.min));
    var y_axis = getLinePoints(pos(0,height_range.min),pos(0,height_range.max));
    var x1 = ptsToScreen(x_axis, height_range, time_range, screen_rects[0]);
    var y1 = ptsToScreen(y_axis, height_range, time_range, screen_rects[0]);
    var axes_color = 'rgb(50,50,50)';
    drawLine(x1, axes_color);
    drawLine(y1, axes_color);
    var x2 = ptsToScreen(ptsToDistortedAxes(x_axis), height_range, time_range, screen_rects[1]);
    var y2 = ptsToScreen(ptsToDistortedAxes(y_axis), height_range, time_range, screen_rects[1]);
    drawLine(x2, axes_color);
    drawLine(y2, axes_color);

    // draw some parabolas
    var fall_time = freeFallTime(height_range.max, height_range.min, earth_mass);
    var parabolas = [parabola(pos(-0.2*fall_time, height_range.min+(height_range.max-height_range.min)*0.75), 'rgb(100,100,200)'),
                     parabola(pos(0.1*fall_time, height_range.min+(height_range.max-height_range.min)*0.45), 'rgb(200,100,100)'),
                     parabola(pos(0.2*fall_time, height_range.min+(height_range.max-height_range.min)*0.32), 'rgb(200,100,200)'),
                     parabola(pos(0.4*fall_time, height_range.min+(height_range.max-height_range.min)*0.32), 'rgb(100,200,100)')];
    for(var i=0;i<=10;i++) {
        parabolas.push( parabola(pos(0, height_range.min+i*(height_range.max-height_range.min)/10.0), 'rgb(150,150,150)') );
    }
    parabolas.forEach(parabola => {
        var pts = getParabolaPoints(parabola.peak.x, parabola.peak.y, height_range.min, earth_mass);
        var pts1 = ptsToScreen(pts, height_range, time_range, screen_rects[0]);
        drawLine(pts1, parabola.color);
        drawSpacedCircles(pts1, 1.5, parabola.color);
        var pts2 = ptsToDistortedAxes(pts);
        pts2 = ptsToScreen(pts2, height_range, time_range, screen_rects[1]);
        drawLine(pts2, parabola.color);
        drawSpacedCircles(pts2, 1.5, parabola.color);
    });
}

window.onload = init;
