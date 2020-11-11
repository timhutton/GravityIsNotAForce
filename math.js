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
    constructor(p, look_at, up, f, pp) {
        this.p = p; // camera center
        this.look_at = look_at; // point we are looking at
        this.up = up; // up-vector
        this.f = f; // scalar focal distance
        this.pp = pp; // 2D principal point
    }
    project(pt) {
        var z = normalize(sub(this.look_at, this.p));
        var x = normalize(cross(z, this.up));
        var y = normalize(cross(x, z));
        var ray = sub(pt, this.p); // the ray from camera center to point
        var cp = new P(dot(x, ray), dot(y, ray), dot(z, ray)); // the point in camera space
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
    return scalar_mul(a, 1 / Math.sqrt(dot(a, a)));
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

function sech(x) { return 1 / Math.cosh(x); }

function pseudosphere(p) {
    // Transform point p ( x in [0, 2pi], y in [-inf, inf], ) onto the pseudosphere, following https://mathworld.wolfram.com/Pseudosphere.html
    var u = p.y;
    var v = p.x;
    return new P(sech(u) * Math.cos(v), sech(u) * Math.sin(v), Math.tanh(u)-u);
}

function poincareToKlein(p, circle) {
    // untested
    var u = dist(p, circle.p) / circle.r;
    var s = 2 * u / (1 + u * u);
    return add(circle.p, scalar_mul(sub(p, circle.p), circle.r * s / u));
}

function kleinToPoincare(p, circle) {
    // untested
    var s = dist(p, circle.p) / circle.r;
    var u = s / (1 + Math.sqrt(1 - s * s));
    return add(circle.p, scalar_mul(sub(p, circle.p), circle.r * u / s));
}

function getLinePoints(a, b, n_pts=100) {
    var pts = [];
    for(var i=0;i<=n_pts;i++) {
        var u = i / n_pts;
        pts.push(lerp(a, b, u));
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
