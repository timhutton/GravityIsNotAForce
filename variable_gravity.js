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

function toDistortedAxes(p)
{
    // return the corresponding location on the distorted axes
    var time = p.x;
    var final_height = p.y;
    var time_diff = Math.abs(time - (time_range.max+time_range.min)/2);
    return pos(time, findInitialHeight(time_diff, final_height, earth_mass));
}

function toStandardAxes(p)
{
    // return the corresponding location on the orthogonal axes
    var time = p.x;
    var height = p.y;
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

function transformPoints(pts, func) {
    var new_pts = [];
    for(var i=0;i<pts.length;i++) {
        new_pts.push(func(pts[i]));
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

    var heightRangeSlider = document.getElementById("heightRangeSlider");
    height_range.max = (earth_radius+1000) + (moon_distance-(earth_radius+50)) * Math.pow(heightRangeSlider.value / 100.0, 3);
    heightRangeSlider.oninput = function() {
        height_range.max = (earth_radius+1000) + (moon_distance-(earth_radius+50)) * Math.pow(heightRangeSlider.value / 100.0, 3);
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

    function graph(screen_rect, transform) {
        return {screen_rect:screen_rect, transform:transform };
    }
    
    var graphs = [ graph(rect(40,50,600,400), p => { return p; }), graph(rect(760,50,600,400), toDistortedAxes) ];
    graphs.forEach(graph => {
        ctx.save(); // save the original clip for now
        
        // fill background with white
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.beginPath();
        ctx.rect(graph.screen_rect.x, graph.screen_rect.y, graph.screen_rect.width, graph.screen_rect.height);
        ctx.fill();
        ctx.clip(); // clip to this rect until restored
        
        // draw axes
        var x_axis = getLinePoints(pos(time_range.min,height_range.min),pos(time_range.max,height_range.min));
        var y_axis = getLinePoints(pos(0,height_range.min),pos(0,height_range.max));
        x_axis = transformPoints(x_axis, graph.transform);
        y_axis = transformPoints(y_axis, graph.transform);
        x_axis = ptsToScreen(x_axis, height_range, time_range, graph.screen_rect);
        y_axis = ptsToScreen(y_axis, height_range, time_range, graph.screen_rect);
        var axes_color = 'rgb(50,50,50)';
        drawLine(x_axis, axes_color);
        drawLine(y_axis, axes_color);

        // show the height range as text
        ctx.fillStyle = 'rgb(0,0,0)';
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Earth surface", graph.screen_rect.x+graph.screen_rect.width/2, (graph.screen_rect.y+graph.screen_rect.height+canvas.height)/2);
        ctx.fillText(((height_range.max-earth_radius)/1000).toFixed(0)+"km above Earth surface", graph.screen_rect.x+graph.screen_rect.width/2, graph.screen_rect.y/2);

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
            pts = transformPoints(pts, graph.transform);
            pts = ptsToScreen(pts, height_range, time_range, graph.screen_rect);
            drawLine(pts, parabola.color);
            drawSpacedCircles(pts, 1.5, parabola.color);
        });
        
        ctx.restore(); // restore the original clip
    });
}

window.onload = init;
