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
    constructor(x, y, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
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
    // A 2D linear transform in the XY plane
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
    constructor(p, look_at, f, pp) {
        this.p = p;
        this.z = normalize( sub(look_at, this.p) );
        var default_up = new P(0,1,0);
        this.x = normalize(cross(this.z, default_up));
        this.y = normalize(cross(this.x, this.z));
        this.f = f;
        this.pp = pp;
    }
    project(pt) {
        var ray = sub(pt, this.p); // the ray from camera center to point
        var cp = new P(dot(this.x, ray), dot(this.y, ray), dot(this.z, ray)); // the point in camera space
        return add(this.pp, scalar_mul(cp, this.f / cp.z)); // pinhole projection
    }
}

// functions:

function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function dist2(a, b) {
    var d = sub(a, b);
    return dot(d, d);
}

function dist(a, b) {
    return Math.sqrt(dist2(a, b));
}

function add(a, b) {
    return new P(a.x + b.x, a.y + b.y, a.z + b.z);
}

function sub(a, b) {
    return new P(a.x - b.x, a.y - b.y, a.z - b.z);
}

function scalar_mul(a, f) {
    return new P(a.x * f, a.y * f, a.z * f);
}

function elementwise_mul(a, b) {
    return new P(a.x * b.x, a.y * b.y, a.z * a.z);
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
    return new P(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}

function lerp(a, b, u) {
    return add(a, scalar_mul(sub(b, a), u));
}

function boundingRect(points) {
    var left = Number.MAX_VALUE;
    var right = -Number.MAX_VALUE;
    var top = Number.MAX_VALUE;
    var bottom = -Number.MAX_VALUE;
    for(var i = 0; i < points.length; i++) {
        left = Math.min(left, points[i].x);
        right = Math.max(right, points[i].x);
        top = Math.min(top, points[i].y);
        bottom = Math.max(bottom, points[i].y);
    }
    return new Rect(new P(left, top), new P(right-left, bottom-top));
}

function sech(x) { return 1 / Math.cosh(x); }

function pseudosphere(p) {
    // Transform point p ( x in [-inf, inf], y in [0, 2pi] ) onto the pseudosphere
    return new P(sech(p.x) * Math.cos(p.y), sech(p.x) * Math.sin(p.y), p.x - Math.tanh(p.x));
}

function getLinePoints(a, b, n_pts=100) {
    var pts = [];
    for(var i=0;i<=n_pts;i++) {
        var u = i / n_pts;
        pts.push(lerp(a, b, u));
    }
    return pts;
}
