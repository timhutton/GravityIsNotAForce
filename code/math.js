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

// classes:

class P{
    constructor(x, y, z=0, w=0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
}

class Circle{
    // Actually an N-sphere but a circle in the 2D case
    constructor(p, r) {
        this.p = p;
        this.r = r;
    }
    invert(p) {
        var r2 = this.r * this.r;
        var d2 = dist2( p, this.p );
        return add( this.p, scalar_mul( sub( p, this.p ), r2 / d2 ) );
    }
}

class Rect {
    // An axis-aligned rectangle in the XY plane
    constructor(p, size) {
        this.p = p;
        this.size = size;
    }
    get xmin() { return Math.min(this.p.x, this.p.x+this.size.x); }
    get xmax() { return Math.max(this.p.x, this.p.x+this.size.x); }
    get ymin() { return Math.min(this.p.y, this.p.y+this.size.y); }
    get ymax() { return Math.max(this.p.y, this.p.y+this.size.y); }
    get min() { return new P(this.xmin, this.ymin); }
    get max() { return new P(this.xmax, this.ymax); }
    get center() { return add( this.p, scalar_mul(this.size, 0.5) ); }
    pointInRect(p) { return p.x >= this.xmin && p.x <= this.xmax && p.y >= this.ymin && p.y <= this.ymax; }
    clamp(p) { return new P(Math.min(Math.max(p.x, this.xmin), this.xmax), Math.min(Math.max(p.y, this.ymin), this.ymax)); }
}

class LinearTransform2D {
    // A 2D scale and translation in the XY plane
    constructor(from_rect, to_rect) {
        var scale = elementwise_div_2d(to_rect.size, from_rect.size);
        var offset = sub(to_rect.p, elementwise_mul(from_rect.p, scale));
        this.forwards = p => add( offset, elementwise_mul(p, scale) );
        this.backwards = p => elementwise_div_2d( sub( p, offset ), scale );
    }
}

class Transform {
    constructor(forwards, backwards) {
        this.forwards = forwards;
        this.backwards = backwards;
    }
}

class ComposedTransform {
    constructor(...transforms) {
        this.forwards = p => transforms.reduce((pt, transform) => transform.forwards(pt), p);
        this.backwards = p => transforms.reduceRight((pt, transform) => transform.backwards(pt), p);
    }
}

class Camera {
    constructor(p, look_at, up, f, pp, near = 1) {
        this.p = p; // camera center
        this.look_at = look_at; // point we are looking at
        this.up = up; // up-vector
        this.f = f; // scalar focal distance
        this.pp = pp; // 2D principal point
        this.near = near; // the near plane
    }
    project(pt) {
        var z = normalize(sub(this.look_at, this.p));
        var x = normalize(cross(z, this.up));
        var y = normalize(cross(x, z));
        var ray = sub(pt, this.p); // the ray from camera center to point
        var cp = new P(dot(x, ray), dot(y, ray), dot(z, ray)); // the point in camera space
        cp.z = Math.max(cp.z, this.near);
        return add(this.pp, invert_y(scalar_mul(cp, this.f / cp.z))); // pinhole projection
    }
}

// functions:

function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
}

function dist2(a, b) {
    var d = sub(a, b);
    return dot(d, d);
}

function len(a) {
    return Math.sqrt(dot(a, a));
}

function dist(a, b) {
    return Math.sqrt(dist2(a, b));
}

function add(a, b) {
    return new P(a.x + b.x, a.y + b.y, a.z + b.z, a.w + b.w);
}

function sub(a, b) {
    return new P(a.x - b.x, a.y - b.y, a.z - b.z, a.w - b.w);
}

function scalar_mul(a, f) {
    return new P(a.x * f, a.y * f, a.z * f, a.w * f);
}

function rotateXY(p, theta) {
    var s = Math.sin(theta);
    var c = Math.cos(theta);
    return new P(p.x * c - p.y * s, p.x * s + p.y * c, p.z, p.w);
}

function rotateAroundVector(v, k, theta) {
    // Rotate point v around axis k, following https://en.wikipedia.org/wiki/Rodrigues%27_rotation_formula
    var s = Math.sin(theta);
    var c = Math.cos(theta);
    return add(add(scalar_mul(v, c), scalar_mul(cross(k, v), s)), scalar_mul(k, dot(k, v) * (1 - c)));
}

function rotateAroundPointAndVector(v, p, k, theta) {
    // Rotate point v around vector k from point p by angle theta
    var v2 = sub(v, p);
    var q = rotateAroundVector(v2, k, theta);
    return add(q, p);
}

function angleBetweenTwoVectors(a, b) {
    return Math.acos(dot(a, b) / (len(a) * len(b)));
}

function signedAngleBetweenTwoPointsXY(a, b) {
    // Returns the angle required to rotate a to b
    var theta = Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x);
    if(theta > Math.PI) { theta -= 2 * Math.PI; }
    else if (theta <= -Math.PI) { theta += 2 * Math.PI; }
    return theta;
}

function elementwise_mul(a, b) {
    return new P(a.x * b.x, a.y * b.y, a.z * b.z, a.w * b.w);
}

function elementwise_div_2d(a, b) {
    // Specialized to avoid div0 when b.z is 0 in the 2D case
    return new P(a.x / b.x, a.y / b.y);
}

function elementwise_div_3d(a, b) {
    return new P(a.x / b.x, a.y / b.y, a.z / b.z);
}

function normalize(a) {
    return scalar_mul(a, 1 / len(a));
}

function cross( a, b ) {
    // Cross-product in xyz
    return new P(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}

function lerp(a, b, u) {
    return add(a, scalar_mul(sub(b, a), u));
}

function invert_y(a) {
    return new P(a.x, -a.y, a.z, a.w);
}

function getLinePoints(a, b, n_pts=100) {
    var pts = [];
    for(var i=0;i<=n_pts;i++) {
        var u = i / n_pts;
        pts.push(lerp(a, b, u));
    }
    return pts;
}

function getEllipsePoints(c, a, b, n_pts=100, repeat_first_point=true) {
    // Return a list of points spaced around an ellipse with center c and radii vectors a and b.
    var pts = [];
    var last = repeat_first_point ? n_pts : n_pts - 1;
    for(var i = 0; i <= last; i++) {
        var theta = 2 * Math.PI * i / n_pts;
        pts.push(add(c, add(scalar_mul(a, Math.cos(theta)), scalar_mul(b, Math.sin(theta)))));
    }
    return pts;
}

function midpoint_integrate(lower, upper, n_evaluations, func) {
    var dx = (upper - lower) / n_evaluations;
    var x = lower + dx / 2;
    var result = 0;
    for(var iStep = 0; iStep < n_evaluations; iStep++) {
        result += func(x);
        x += dx;
    }
    return dx * result;
}

function simpsons_integrate(lower, upper, n_evaluations, func) {
    var n = n_evaluations + 1 - (n_evaluations % 2); // need an odd number of evaluation points
    var dx = (upper - lower) / (n - 1);
    var result = func(lower) + func(upper);
    var x = lower;
    for(var iStep = 1; iStep < n-1; iStep++) {
        x += dx;
        result += func(x) * (2 + 2 * (iStep%2));
    }
    return dx * result / 3;
}

function bisection_search(target, a, b, max_iterations, func) {
    // Return the value x such that func(x +/- tolerance) == target. Function must be monotonic between a and b.
    var value_a = func(a);
    var value_b = func(b);
    if(Math.sign(target - value_a) === Math.sign(target - value_b)) {
        throw new Error("bisection_search needs target value to lie between func(a) and func(b)");
    }
    for(var it = 0; it < max_iterations; it++) {
        var mid = (a + b) / 2;
        var value_mid = func(mid);
        if(Math.sign(target - value_a) == Math.sign(target - value_mid)) {
            a = mid;
            value_a = value_mid;
        }
        else {
            b = mid;
            value_b = value_mid;
        }
        if(isClose(a, b)) {
            return mid;
        }
    }
    throw new Error("Max iterations exceeded in bisection_search. Remaining gap: " + Math.abs((b - a) / 2).toFixed(8));
}

function divideNicely(x, n_divisions) {
    // Return a value that divides x into roughly the specified number of divisions
    // such that the value is either a power of 10 or the same x2 or the same x5
    var value1 = Math.pow(10, Math.floor(Math.log10(x / n_divisions)));
    var value2 = value1 * 2;
    var value5 = value1 * 5;
    var value1_closeness = Math.abs(n_divisions - x / value1);
    var value2_closeness = Math.abs(n_divisions - x / value2);
    var value5_closeness = Math.abs(n_divisions - x / value5);
    if( value1_closeness < value2_closeness ) { return value1; }
    else if( value2_closeness < value5_closeness ) { return value2; }
    else { return value5; }
}

function isClose(a, b, rtol = 1e-5, atol = 1e-8) {
    return Math.abs(a - b) <= (atol + rtol * Math.abs(b))
}