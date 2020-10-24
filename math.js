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

class P2{
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Circle{
    constructor(p, r) {
        this.p = p;
        this.r = r;
    }
}

class Rect {
    constructor(p, size) {
        this.p = p;
        this.size = size;
    }
    get xmin() { return Math.min(this.p.x, this.p.x+this.size.x); }
    get xmax() { return Math.max(this.p.x, this.p.x+this.size.x); }
    get ymin() { return Math.min(this.p.y, this.p.y+this.size.y); }
    get ymax() { return Math.max(this.p.y, this.p.y+this.size.y); }
    get min() { return new P2(this.xmin, this.ymin); }
    get max() { return new P2(this.xmax, this.ymax); }
    get center() { return add( this.p, scalar_mul(this.size, 0.5) ); }
}


class LinearTransform {
    constructor(offset, scale) {
        this.offset = offset;
        this.scale = scale;
    }
}

// functions:

function dot(a, b) {
    return a.x * b.x + a.y * b.y;
}

function dist2(a, b) {
    var d = sub(a, b);
    return dot(d, d);
}

function dist(a, b) {
    return Math.sqrt(dist2(a, b));
}

function add(a, b) {
    return new P2(a.x + b.x, a.y + b.y);
}

function sub(a, b) {
    return new P2(a.x - b.x, a.y - b.y);
}

function scalar_mul(a, f) {
    return new P2(a.x * f, a.y * f);
}

function elementwise_mul(a, b) {
    return new P2(a.x * b.x, a.y * b.y);
}

function elementwise_div(a, b) {
    return new P2(a.x / b.x, a.y / b.y);
}

function inversion(p, circle) {
    var r2 = circle.r * circle.r;
    var d2 = dist2( p, circle.p );
    return add( circle.p, scalar_mul( sub( p, circle.p ), r2 / d2 ) );
}

function lerp(a, b, u) {
    return add( a, scalar_mul( sub(b, a), u) );
}

function applyLinearTransform(p, transform) {
    return add( transform.offset, elementwise_mul(p, transform.scale) );
}

function applyLinearTransformInverse(p, transform) {
    return elementwise_div( sub( p, transform.offset ), transform.scale );
}

function computeLinearTransform(from_rect, to_rect) {
    var scale = elementwise_div(to_rect.size, from_rect.size);
    var offset = sub(to_rect.p, elementwise_mul(from_rect.p, scale));
    return new LinearTransform(offset, scale);
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
    return new Rect(new P2(left, top), new P2(right-left, bottom-top));
}

function pointInRect( p, rect ) {
    var left = Math.min(rect.p.x, rect.p.x + rect.size.x);
    var right = Math.max(rect.p.x, rect.p.x + rect.size.x);
    var top = Math.min(rect.p.y, rect.p.y + rect.size.y);
    var bottom = Math.max(rect.p.y, rect.p.y + rect.size.y);
    return p.x > left && p.x < right && p.y > top && p.y < bottom;
}

function transformPoints(pts, func) {
    var new_pts = [];
    for(var i=0;i<pts.length;i++) {
        new_pts.push(func(pts[i]));
    }
    return new_pts;
}
