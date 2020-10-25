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
var time_range_offset;
var x_extent;
var y_extent;

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

function getLinePoints(a, b, n_pts=100) {
    var pts = [];
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

function drawSpacedCircles(pts, r, color, nth=20) {
    ctx.fillStyle = color;
    for(var i=0;i<pts.length;i+=nth) {
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

    var highest_allowed_top = moon_distance;
    var lowest_allowed_top = earth_radius+1000;
    spacetime_range = new Rect( new P2(0, earth_radius), new P2(0, 0)); // will fill in the rest shortly

    var heightRangeSlider = document.getElementById("heightRangeSlider");
    spacetime_range.size.y = lowest_allowed_top + (highest_allowed_top-lowest_allowed_top) * Math.pow(heightRangeSlider.value / 100.0, 3) - spacetime_range.ymin;
    heightRangeSlider.oninput = function() {
        spacetime_range.size.y = lowest_allowed_top + (highest_allowed_top-lowest_allowed_top) * Math.pow(heightRangeSlider.value / 100.0, 3) - spacetime_range.ymin;
        fitTimeRange(time_range_offset);
        draw();
    }

    var timeTranslationSlider = document.getElementById("timeTranslationSlider");
    time_range_offset = 1 - 2 * timeTranslationSlider.value / 100.0;
    timeTranslationSlider.oninput = function() {
        time_range_offset = 1 - 2 * timeTranslationSlider.value / 100.0;
        fitTimeRange(time_range_offset);
        draw();
    }

    var xExtentSlider = document.getElementById("xExtentSlider");
    x_extent = 2 * xExtentSlider.value / 100.0;
    xExtentSlider.oninput = function() {
        x_extent = 2 * xExtentSlider.value / 100.0;
        draw();
    }

    var yExtentSlider = document.getElementById("yExtentSlider");
    y_extent = 2 * yExtentSlider.value / 100.0;
    yExtentSlider.oninput = function() {
        y_extent = 2 * yExtentSlider.value / 100.0;
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

    var x_axis = getLinePoints(spacetime_range.min, new P2(spacetime_range.xmax, spacetime_range.ymin));
    var y_axis = getLinePoints(new P2(0, spacetime_range.ymin), new P2(0, spacetime_range.ymax));
    var minor_axes = [];
    for(var y = spacetime_range.ymin; y<=spacetime_range.ymax; y+= spacetime_range.size.y/10) {
        minor_axes.push(getLinePoints(new P2(spacetime_range.xmin, y), new P2(spacetime_range.xmax, y)));
    }
    for(var x = spacetime_range.xmin; x<=spacetime_range.xmax; x+= spacetime_range.size.x/10) {
        minor_axes.push(getLinePoints(new P2(x, spacetime_range.ymin), new P2(x, spacetime_range.ymax)));
    }
    var fall_time = freeFallTime(spacetime_range.ymax, spacetime_range.ymin, earth_mass);
    var parabolas = [new Parabola(new P2(-0.2*fall_time, spacetime_range.ymin+spacetime_range.size.y*0.75), 'rgb(100,100,200)'),
                     new Parabola(new P2( 0.1*fall_time, spacetime_range.ymin+spacetime_range.size.y*0.45), 'rgb(200,100,100)'),
                     new Parabola(new P2( 0.2*fall_time, spacetime_range.ymin+spacetime_range.size.y*0.32), 'rgb(200,100,200)'),
                     new Parabola(new P2( 0.4*fall_time, spacetime_range.ymin+spacetime_range.size.y*0.32), 'rgb(100,200,100)')];
    for(var i=0;i<=10;i++) {
        parabolas.push( new Parabola(new P2(0, spacetime_range.ymin+i*spacetime_range.size.y/10.0), 'rgb(150,150,150)') );
    }

    var rect1 = new Rect( new P2(40,50), new P2(600,400));
    var rect2 = new Rect( new P2(760,50), new P2(600,400));
    var distanceFallenTransform = new Transform( toDistanceFallenDistortedAxes, fromDistanceFallenDistortedAxes );
    var flipY = p => { return new P2(p.x, spacetime_range.ymax - p.y + spacetime_range.ymin); };
    var flipYTransform = new Transform( flipY, flipY );

    // define the Klein pseudosphere transforms
    var circle = new Circle(new P2(1060, 50), 400);
    var invert = p => { return inversion(p, circle); };
    var inversionTransform = new Transform( invert, invert );
    var spacing = 100;
    var kp_input_rect = new Rect(new P2(circle.p.x-circle.r*x_extent,circle.p.y+circle.r), new P2(2*circle.r*x_extent,circle.r*y_extent));
    var kleinPseudosphereAxes = new Graph( rect2, new ComposedTransform( computeLinearTransform(spacetime_range, kp_input_rect), inversionTransform ) );
    // TODO: turn Poincare into Klein

    // draw the graphs
    var standardAxes = new Graph( rect1, new ComposedTransform( flipYTransform, computeLinearTransform(spacetime_range, rect1) ) );
    var distanceFallenAxes = new Graph( rect2, new ComposedTransform( distanceFallenTransform, new ComposedTransform( flipYTransform, computeLinearTransform(spacetime_range, rect2)) ) );
    [ standardAxes, kleinPseudosphereAxes, /*, distanceFallenAxes*/ ].forEach(graph => {
        ctx.save(); // save the original clip for now

        // fill background with white
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.beginPath();
        ctx.rect(graph.screen_rect.xmin, graph.screen_rect.ymin, graph.screen_rect.size.x, graph.screen_rect.size.y);
        ctx.fill();
        ctx.clip(); // clip to this rect until restored

        // draw axes
        var x_axis_transformed = transformPoints(x_axis, graph.transform.forwards);
        var y_axis_transformed = transformPoints(y_axis, graph.transform.forwards);
        var axes_color = 'rgb(50,50,50)';
        drawLine(x_axis_transformed, axes_color);
        drawLine(y_axis_transformed, axes_color);
        var axes_color = 'rgb(210,210,210)';
        minor_axes.forEach( axes => { drawLine(transformPoints(axes, graph.transform.forwards), axes_color); } );


        // draw some parabolas
        parabolas.forEach(parabola => {
            var pts = getParabolaPoints(parabola.peak.x, parabola.peak.y, spacetime_range.p.y, earth_mass);
            pts = transformPoints(pts, graph.transform.forwards);
            drawLine(pts, parabola.color);
            drawSpacedCircles(pts, 1.5, parabola.color);
        });

        ctx.restore(); // restore the original clip
    });

    // show the height range as text next to the first graph
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Earth surface", rect1.center.x, (rect1.ymax+canvas.height)/2);
    ctx.fillText((spacetime_range.size.y/1000).toFixed(0)+"km above Earth surface", rect1.center.x, rect1.ymin/2);
}

window.onload = init;
