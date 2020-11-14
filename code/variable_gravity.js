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
var vertical_vertical_view_angle;
var horizontal_vertical_view_angle;
var Jonsson_embedding;

class Geodesic {
    constructor(peak, color) {
        this.peak = peak;
        this.color = color;
    }
}

class Graph {
    constructor(screen_rect, transform, top_text, left_text, bottom_text) {
        this.screen_rect = screen_rect;
        this.transform = transform;
        this.top_text = top_text;
        this.left_text = left_text;
        this.bottom_text = bottom_text;
    }
}

function toDistanceFallenDistortedAxes(p)
{
    // return the corresponding location on the axes where the space dimension is shifted up by the distance fallen
    var time = p.x;
    var final_height = p.y;
    var time_mid = spacetime_range.center.x; // center of the current time window
    var time_diff = Math.abs(time - time_mid);
    return new P(time, findInitialHeight(time_diff, final_height, earth_mass));
}

function fromDistanceFallenDistortedAxes(p)
{
    // return the corresponding location on the orthogonal axes given the location on the ones where the space dimension is shifted up by the distance fallen
    var time = p.x;
    var height = p.y;
    var time_mid = spacetime_range.center.x; // center of the current time window
    var time_diff = Math.abs(time - time_mid);
    return new P(time, height - freeFallDistance(time_diff, height, earth_mass));
}

function getFreeFallPoints(peak_time, peak_height, min_height, planet_mass, n_pts = 100) {
    var fallTime = freeFallTime(peak_height, min_height, planet_mass);
    var pts = [];
    // from the left up
    for(var i=0;i<n_pts;i++) {
        var t = peak_time - fallTime + i*fallTime/n_pts;
        var h = peak_height - freeFallDistance(peak_time-t, peak_height, planet_mass);
        h = Math.max(earth_radius, h);
        pts.push(new P(t,h));
    }
    // from the top down
    for(var i=0;i<=n_pts;i++) {
        var t = peak_time + i*fallTime/n_pts;
        var h = peak_height - freeFallDistance(t - peak_time, peak_height, planet_mass);
        h = Math.max(earth_radius, h);
        pts.push(new P(t,h));
    }
    return pts;
}

function fitTimeRange(time_range_offset) {
    // pick the time range to allow for a free-fall from the max height to the min height
    var fall_time = freeFallTime(spacetime_range.ymax, spacetime_range.ymin, earth_mass);
    // time_range_offset slides the time window left and right by multiples of the existing time range
    spacetime_range.p.x = -fall_time + fall_time*time_range_offset;
    spacetime_range.size.x = fall_time * 2;
    console.log(spacetime_range.size.x);
}


function testEmbeddingByPathLengths() {
    // generate trajectories that start and end at the same points, for different values of g
    // measure their arc length on the embedding - the one for the correct g should be the shortest
    var time_to_fall = 1; // pick a time
    for(var dm = -earth_mass *0.7; dm < earth_mass / 2; dm += earth_mass / 20) {
        var planet_mass = earth_mass + dm;
        var h = findInitialHeight(time_to_fall, earth_radius, planet_mass);
        var pts = getFreeFallPoints(0, h, earth_radius, planet_mass, 100).map(p => Jonsson_embedding.getEmbeddingPointFromSpacetime(p));
        var length = 0;
        for(var iPt = 1; iPt < pts.length; iPt++) {
            length += dist(pts[iPt], pts[iPt-1]);
        }
        console.log(dm, h, length);
    }
    throw new Error(); // to stop the rest of the script
}

function testEmbeddingByPathTurning() {
    // generate trajectories that start and end at the same points, for different values of g
    // measure how much they deviate from the plane that includes the surface normal
    var time_to_fall = 1; // pick a time
    [-earth_mass * 0.1, 0, earth_mass * 0.1].forEach( dm => {
        var planet_mass = earth_mass + dm;
        var h = findInitialHeight(time_to_fall, earth_radius, planet_mass);
        var pts = getFreeFallPoints(0, h, earth_radius, planet_mass, 200);
        var sum_turns = 0;
        var sum_abs_turns = 0;
        for(var iPt = 1; iPt < pts.length-1; iPt++) {
            var p = Jonsson_embedding.getEmbeddingPointFromSpacetime(pts[iPt]);
            var n = Jonsson_embedding.getSurfaceNormalFromSpacetime(pts[iPt]);
            var pre = Jonsson_embedding.getEmbeddingPointFromSpacetime(pts[iPt-1]);
            var post = Jonsson_embedding.getEmbeddingPointFromSpacetime(pts[iPt+1]);
            var incoming_segment = sub(p, pre);
            var outgoing_segment = sub(post, p);
            var norm_vec = normalize(cross(incoming_segment, n));
            var turning_angle = Math.asin(dot(outgoing_segment, norm_vec) / len(outgoing_segment));
            sum_turns += turning_angle;
            sum_abs_turns += Math.abs(turning_angle);
            console.log(dm, turning_angle);
        }
    });
    throw new Error(); // to stop the rest of the script
}

function getTimeLabel(t) {
    var label = t.toFixed(2)+"s";
    if(Math.abs(t) > 24 * 60 * 60 * 2) {
        label = (t/(24 * 60 * 60)).toFixed(0)+"d";
    }
    else if(Math.abs(t) > 60 * 60 * 2) {
        label = (t/(60 * 60)).toFixed(0)+"h";
    }
    else if(Math.abs(t) > 60 * 2) {
        label = (t/60).toFixed(0)+"min";
    }
    else if(Math.abs(t) > 1 * 2) {
        label = t.toFixed(1)+"s";
    }
    return label;
}

function getDistanceLabel(x) {
    var label = x.toFixed(2)+"m";
    if(Math.abs(x) >= 1e12) {
        label = (x/1e12).toFixed(0)+"Tm";
    }
    else if(Math.abs(x) >= 1e9) {
        label = (x/1e9).toFixed(0)+"Gm";
    }
    else if(Math.abs(x) >= 1e6) {
        label = (x/1e6).toFixed(0)+"Mm";
    }
    else if(Math.abs(x) >= 1e3) {
        label = (x/1e3).toFixed(0)+"km";
    }
    return label;
}

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    var lowest_height = earth_radius;
    //var highest_allowed_top = moon_distance;
    var highest_allowed_top = earth_radius + 10000;
    var lowest_allowed_top = lowest_height + 500;

    var height = 2.3;//moon_distance - earth_radius;
    var time_width = freeFallTime(height + earth_radius, earth_radius, earth_mass);
    spacetime_range = new Rect( new P(-time_width, lowest_height), new P(2 * time_width, height));
    Jonsson_embedding = new JonssonEmbedding(0.8, spacetime_range.size.x);

    /*var heightRangeSlider = document.getElementById("heightRangeSlider");
    spacetime_range.size.y = lowest_allowed_top + (highest_allowed_top-lowest_allowed_top) * Math.pow(heightRangeSlider.value / 100.0, 3) - lowest_height;
    heightRangeSlider.oninput = function() {
        spacetime_range.size.y = lowest_allowed_top + (highest_allowed_top-lowest_allowed_top) * Math.pow(heightRangeSlider.value / 100.0, 3) - lowest_height;
        console.log("spacetime_range.size.y: ",spacetime_range.size.y);
        fitTimeRange(time_range_offset);
        draw();
    }*/

    /*var timeTranslationSlider = document.getElementById("timeTranslationSlider");
    time_range_offset = 1 - 2 * timeTranslationSlider.value / 100.0;
    timeTranslationSlider.oninput = function() {
        time_range_offset = 1 - 2 * timeTranslationSlider.value / 100.0;
        fitTimeRange(time_range_offset);
        draw();
    }*/
    //time_range_offset = 0;
    //fitTimeRange(time_range_offset);

    var verticalViewAngleSlider = document.getElementById("verticalViewAngleSlider");
    vertical_view_angle = 20 - 40 * verticalViewAngleSlider.value / 100.0;
    verticalViewAngleSlider.oninput = function() {
        vertical_view_angle = 20 - 40 * verticalViewAngleSlider.value / 100.0;
        draw();
    }

    var horizontalViewAngleSlider = document.getElementById("horizontalViewAngleSlider");
    horizontal_view_angle = Math.PI + 2 * Math.PI * horizontalViewAngleSlider.value / 100.0;
    horizontalViewAngleSlider.oninput = function() {
        horizontal_view_angle = Math.PI + 2 * Math.PI * horizontalViewAngleSlider.value / 100.0;
        draw();
    }

    var slopeSlider = document.getElementById("slopeSlider");
    Jonsson_embedding.setSlopeAngle(slopeSlider.value / 100.0);
    slopeSlider.oninput = function() {
        Jonsson_embedding.setSlopeAngle(slopeSlider.value / 100.0);
        draw();
    }

    var timeWrappingSlider = document.getElementById("timeWrappingSlider");
    Jonsson_embedding.setTimeWrapping(3 * spacetime_range.size.x * timeWrappingSlider.value / 100.0);
    timeWrappingSlider.oninput = function() {
        Jonsson_embedding.setTimeWrapping(3 * spacetime_range.size.x * timeWrappingSlider.value / 100.0);
        draw();
    }

    //top_peak = spacetime_range.ymax;
    //test_geodesic = Jonsson_embedding.getGeodesicPoints(new P(0, top_peak), new P(0.2, top_peak), 50000);

    draw();
}

function draw() {
    // fill canvas with light gray
    ctx.fillStyle = 'rgb(240,240,240)';
    ctx.beginPath();
    ctx.rect(0,0,canvas.width, canvas.height);
    ctx.fill();

    var x_axis = getLinePoints(spacetime_range.min, new P(spacetime_range.xmax, spacetime_range.ymin), 200);
    var y_axis = getLinePoints(new P(0, spacetime_range.ymin), new P(0, spacetime_range.ymax), 200);
    var minor_axes = [];
    var y_step = divideNicely(spacetime_range.size.y, 7);
    for(var y = spacetime_range.ymin; y<=spacetime_range.ymax; y+= y_step) {
        minor_axes.push(getLinePoints(new P(spacetime_range.xmin, y), new P(spacetime_range.xmax, y), 200));
    }

    var x_step = divideNicely(spacetime_range.size.x, 7);
    for(var x = x_step; x<=spacetime_range.xmax; x+= x_step) {
        minor_axes.push(getLinePoints(new P(x, spacetime_range.ymin), new P(x, spacetime_range.ymax), 200));
    }
    for(var x = -x_step; x>=spacetime_range.xmin; x-= x_step) {
        minor_axes.push(getLinePoints(new P(x, spacetime_range.ymin), new P(x, spacetime_range.ymax), 200));
    }
    var fall_time = freeFallTime(spacetime_range.ymax, spacetime_range.ymin, earth_mass);
    var geodesics = [new Geodesic(new P(0, spacetime_range.ymax), 'rgb(100,100,200)'),
                     new Geodesic(new P(0, spacetime_range.ymin + spacetime_range.size.y * 0.5), 'rgb(200,100,100)'),
                     new Geodesic(new P(0, spacetime_range.ymin + spacetime_range.size.y * 0.25), 'rgb(200,100,200)'),
                     new Geodesic(new P(0, spacetime_range.ymin + spacetime_range.size.y * 0.125), 'rgb(100,200,100)')];
    /*for(var i=0;i<=10;i++) {
        geodesics.push( new Geodesic(new P(0, spacetime_range.ymin+i*spacetime_range.size.y/10.0), 'rgb(150,150,150)') );
    }*/

    var n_graphs = 2;
    var margin = 40;
    var size = Math.min(canvas.height-margin*2, (canvas.width-margin*(n_graphs+1)) / n_graphs);
    var rect1 = new Rect( new P(margin+(margin+size)*0,50), new P(size,size));
    var rect2 = new Rect( new P(margin+(margin+size)*1,50), new P(size,size));
    var rect3 = new Rect( new P(margin+(margin+size)*2,50), new P(size,size));
    var rect4 = new Rect( new P(margin+(margin+size)*3,50), new P(size,size));
    var distanceFallenTransform = new Transform( toDistanceFallenDistortedAxes, fromDistanceFallenDistortedAxes );
    var flipY = p => new P(p.x, spacetime_range.ymax - p.y + spacetime_range.ymin);
    var flipYTransform = new Transform( flipY, flipY );

    // define the Klein pseudosphere transforms
    /*var circle = new Circle(new P(rect4.center.x, rect4.ymin), rect4.size.x); // TODO: make own space
    var invert = p => circle.invert(p);
    var inversionTransform = new Transform( invert, invert );
    var x_extent = 1;
    var y_extent = 1;
    var spacing = 100;
    var kp_input_rect = new Rect(new P(circle.p.x-circle.r*x_extent,circle.p.y+circle.r), new P(2*circle.r*x_extent,circle.r*y_extent));
    var circle2 = new Circle(rect4.center, rect4.size.x/2); // the half-plane (~kp_input_rect) transformed into this circle
    var poincareToKleinTransform = new Transform( p => poincareToKlein(p, circle2), p => kleinToPoincare(p, circle2) ); // TODO: doesn't work as expected
    var kleinPseudosphereAxes = new Graph( rect4, new ComposedTransform( new LinearTransform2D(spacetime_range, kp_input_rect),
                        inversionTransform, /poincareToKleinTransform/ ), "Poincare-pseudosphere", "", "" ); // TODO add transform to rect4
                        */

    // define the 3D transforms
    /*var toPseudosphereCoords = new LinearTransform2D(spacetime_range, new Rect(new P(-2,0), new P(4,1.5)));
    var identityTransform = p => new P(p.x, p.y, p.z);
    var pseudosphereTransform = new Transform(pseudosphere, identityTransform); // TODO: need camera ray intersection for the reverse
    var camera = new Camera(new P(-10,-0.5,-vertical_view_angle), new P(0,0,-0.5), new P(0,0,-1), 1500, rect3.center);
    var cameraTransform = new Transform( p => camera.project(p), identityTransform );
    var pseudosphereAxes = new Graph( rect3, new ComposedTransform( toPseudosphereCoords, pseudosphereTransform, cameraTransform), "Pseudosphere", "", "" );*/

    // define the Jonsson embedding transforms
    var identityTransform = p => new P(p.x, p.y, p.z);
    var JonssonEmbeddingTransform = new Transform( p => Jonsson_embedding.getEmbeddingPointFromSpacetime(p), identityTransform );
    var camera = new Camera(new P(10*Math.cos(-horizontal_view_angle),10*Math.sin(-horizontal_view_angle), -vertical_view_angle),
                            new P(0,0,0.5), new P(0,0,1), 2000, rect2.center);
    var cameraTransform = new Transform( p => camera.project(p), identityTransform );
    var JonssonEmbeddingAxes = new Graph( rect2, new ComposedTransform( JonssonEmbeddingTransform, cameraTransform),
                                          "Jonsson embedding", "", "");

    // draw the graphs
    var standardAxes = new Graph( rect1, new ComposedTransform( flipYTransform, new LinearTransform2D(spacetime_range, rect1) ),
                                  "time "+rightArrow,
                                  "[Earth surface "+rightArrow+" "+getDistanceLabel(spacetime_range.size.y)+" above Earth surface]", "" );
    var distanceFallenAxes = new Graph( rect2, new ComposedTransform( distanceFallenTransform, flipYTransform,
                                        new LinearTransform2D(spacetime_range, rect2) ),
                                        "time "+rightArrow, "space & time "+rightArrow, "" );
    [ standardAxes, /*distanceFallenAxes,*/ /*JonssonEmbeddingAxes,*/ /*pseudosphereAxes, kleinPseudosphereAxes*/ ].forEach(graph => {
        ctx.save(); // save the original clip for now

        // fill background with white
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.beginPath();
        ctx.rect(graph.screen_rect.xmin, graph.screen_rect.ymin, graph.screen_rect.size.x, graph.screen_rect.size.y);
        ctx.fill();
        ctx.clip(); // clip to this rect until restored

        // draw axes
        var axes_color = 'rgb(210,210,210)';
        minor_axes.forEach( axes => { drawLine(axes.map(graph.transform.forwards), axes_color); } );
        var axes_color = 'rgb(50,50,50)';
        drawLine(x_axis.map(graph.transform.forwards), axes_color);
        drawLine(y_axis.map(graph.transform.forwards), axes_color);

        // indicate scale
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        var drawTimeLabel = x => {
            var label = getTimeLabel(x);
            drawText(graph.transform.forwards(new P(x, spacetime_range.ymin)), label);
        };
        for(var x = x_step; x<=spacetime_range.xmax; x+= x_step) {
            drawTimeLabel(x);
        }
        for(var x = -x_step; x>=spacetime_range.xmin; x-= x_step) {
            drawTimeLabel(x);
        }
        for(var h = spacetime_range.ymin + y_step; h < spacetime_range.ymax; h+=y_step) {
            drawText(graph.transform.forwards(new P(0, h)), getDistanceLabel(h - earth_radius));
        }

        // draw some geodesics
        geodesics.forEach(geodesic => {
            var pts = getFreeFallPoints(geodesic.peak.x, geodesic.peak.y, spacetime_range.p.y, earth_mass, 500);
            pts = pts.map(graph.transform.forwards);
            drawLine(pts, geodesic.color);
            fillSpacedCircles(pts, 1.5, geodesic.color);
        });

        // draw the test geodesic
        //var test_geodesic_screen_pts = test_geodesic.map(graph.transform.forwards);
        //drawLine(test_geodesic_screen_pts, 'rgb(0,0,0)');

        ctx.restore(); // restore the original clip

        // show the graph labels
        ctx.fillStyle = 'rgb(0,0,0)';
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(graph.bottom_text, graph.screen_rect.center.x, graph.screen_rect.ymax + 15);
        ctx.fillText(graph.top_text,    graph.screen_rect.center.x, graph.screen_rect.ymin - 15);
        ctx.save();
        ctx.translate(graph.screen_rect.xmin - 15, graph.screen_rect.center.y);
        ctx.rotate(-Math.PI/2);
        ctx.textAlign = "center";
        ctx.fillText(graph.left_text, 0, 0);
        ctx.restore();
    });

    // axes that go in the time direction (circles)
    var time_minor_axes_h = [earth_radius, earth_radius + 0.1, earth_radius + 0.25, earth_radius + 0.5];
    for(var i = 1; i < 10; i++) {
        time_minor_axes_h.push(earth_radius + i);
        time_minor_axes_h.push(earth_radius + 10*i);
        time_minor_axes_h.push(earth_radius + 100*i);
        time_minor_axes_h.push(earth_radius + 1000*i);
        time_minor_axes_h.push(earth_radius + 10000*i);
        time_minor_axes_h.push(earth_radius + 100000*i);
        time_minor_axes_h.push(earth_radius + 1000000*i);
        time_minor_axes_h.push(earth_radius + 10000000*i);
        time_minor_axes_h.push(earth_radius + 100000000*i);
        time_minor_axes_h.push(earth_radius + 1000000000*i);
        time_minor_axes_h.push(earth_radius + 10000000000*i);
        time_minor_axes_h.push(earth_radius + 100000000000*i);
        time_minor_axes_h.push(earth_radius + 1000000000000*i);
        time_minor_axes_h.push(earth_radius + 10000000000000*i);
    }
    var time_minor_axes_zrh = time_minor_axes_h.map(x => {
        var delta_x = Jonsson_embedding.getDeltaXFromSpace(x);
        var delta_z = Jonsson_embedding.getDeltaZFromDeltaX(delta_x);
        var radius = Jonsson_embedding.getRadiusFromDeltaX(delta_x);
        return [delta_z, radius, x];
    });
    var time_minor_axes = time_minor_axes_zrh.map(zrh => getEllipsePoints(new P(0,0,zrh[0]), new P(zrh[1],0), new P(0,zrh[1]), 60));

    // axes that go in the space directions (curved lines to infinity, repeated by rotation)
    var space_axis_delta_z = [];
    var h = 0;
    var h_step = 0.01;
    var max_height = 1e15;
    var next_change = 1;
    while(h < max_height) {
        space_axis_delta_z.push(Jonsson_embedding.getEmbeddingPointFromSpacetime(new P(0, h + earth_radius)));
        h += h_step;
        if(h >= next_change) {
            next_change *= 10;
            h_step *= 10;
        }
    }
    var base = 10;
    var time_step = divideNicely(Jonsson_embedding.delta_tau_real, 11);
    var time_step_angle = time_step * 2 * Math.PI / Jonsson_embedding.delta_tau_real;
    var n_time_steps = Math.floor(0.5 * Jonsson_embedding.delta_tau_real / time_step) + 1;
    var time_step_angles = [0];
    for(var it = 1; it < n_time_steps; it++) {
        time_step_angles.push(time_step_angle * it);
        time_step_angles.push(-time_step_angle * it);
    }

    [ JonssonEmbeddingAxes ].forEach(graph => {
        ctx.save(); // save the original clip for now

        // fill background with white
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.beginPath();
        ctx.rect(graph.screen_rect.xmin, graph.screen_rect.ymin, graph.screen_rect.size.x, graph.screen_rect.size.y);
        ctx.fill();
        ctx.clip(); // clip to this rect until restored

        // draw minor axes
        var axes_color = 'rgb(210,210,210)';
        time_minor_axes.slice(1).forEach( axes => { drawLine(axes.map(p => camera.project(p)), axes_color); } );
        time_step_angles.slice(1).forEach( theta => drawLine(space_axis_delta_z.map(p => rotateXY(p, theta)).map(p => camera.project(p)), axes_color) );
        // draw major axes
        var axes_color = 'rgb(50,50,50)';
        drawLine(time_minor_axes[0].map(p => camera.project(p)), axes_color);
        drawLine(space_axis_delta_z.map(p => camera.project(p)), axes_color);

        // indicate scale
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        var drawTimeLabel = x => {
            var label = getTimeLabel(x);
            drawText(graph.transform.forwards(new P(x, spacetime_range.ymin)), label);
        };
        for(var i = -n_time_steps + 2; i < n_time_steps - 1; i++) {
            if(i==0) { continue; }
            var x = i * time_step;
            drawTimeLabel(x);
        }
        for(var h = 1; h < 1e15; h *= 10) {
            var delta_x = Jonsson_embedding.getDeltaXFromSpace(h + earth_radius);
            var delta_z = Jonsson_embedding.getDeltaZFromDeltaX(delta_x);
            var radius = Jonsson_embedding.getRadiusFromDeltaX(delta_x);
            var label = getDistanceLabel(h);
            var p = new P(radius, 0, delta_z);
            drawText(camera.project(p), label);
        }
        /*for(var h = spacetime_range.ymin + y_step; h < spacetime_range.ymax; h+=y_step) {
            var label = (h-earth_radius).toFixed(2)+"m";
            if(y_step > 1000) {
                label = ((h-earth_radius)/1000).toFixed(0)+"km";
            }
            drawText(graph.transform.forwards(new P(0, h)), label);
        }*/

        // draw some geodesics
        geodesics.forEach(geodesic => {
            var pts = getFreeFallPoints(geodesic.peak.x, geodesic.peak.y, spacetime_range.p.y, earth_mass, 1500);
            pts = pts.map(graph.transform.forwards);
            drawLine(pts, geodesic.color);
            fillSpacedCircles(pts, 1.5, geodesic.color, 60);
        });

        // draw the test geodesic
        //var test_geodesic_screen_pts = test_geodesic.map(graph.transform.forwards);
        //drawLine(test_geodesic_screen_pts, 'rgb(0,0,0)');

        ctx.restore(); // restore the original clip

        // show the graph labels
        ctx.fillStyle = 'rgb(0,0,0)';
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(graph.bottom_text, graph.screen_rect.center.x, graph.screen_rect.ymax + 15);
        ctx.fillText(graph.top_text,    graph.screen_rect.center.x, graph.screen_rect.ymin - 15);
        ctx.save();
        ctx.translate(graph.screen_rect.xmin - 15, graph.screen_rect.center.y);
        ctx.rotate(-Math.PI/2);
        ctx.textAlign = "center";
        ctx.fillText(graph.left_text, 0, 0);
        ctx.restore();
    });
}

window.onload = init;
