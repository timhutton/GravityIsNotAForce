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

function pos(x, y) {
    return { x:x, y:y };
}

function circle(p, r) {
    return { p:p, r:r };
}

function rect(x, y, width, height) {
    return { x:x, y:y, width:width, height:height };
}

function linearTransform(mult_x, offset_x, mult_y, offset_y) {
    return { mult_x:mult_x, offset_x:offset_x, mult_y:mult_y, offset_y:offset_y };
}

function range(min, max, step=1.0) {
    return { min:min, max:max, step:step };
}

// functions:

function dist2(a, b) {
    return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}

function dist(a, b) {
    return Math.sqrt(dist2(a, b));
}

function add(a, b) {
    return pos(a.x + b.x, a.y + b.y);
}

function sub(a, b) {
    return pos(a.x - b.x, a.y - b.y);
}

function scalarmul(a, f) {
    return pos(a.x * f, a.y * f);
}

function hadamard_produce(a, b) {
    return pos(a.x * b.x, a.y * b.y);
}

function inversion(p, circle) {
    var r2 = circle.r * circle.r;
    var d2 = dist2( p, circle.p );
    return add( circle.p, scalarmul( sub( p, circle.p ), r2 / d2 ) );
}

function lerp(a, b, u) {
    return add( a, scalarmul( sub(b, a), u) );
}

function applyLinearTransform(p, transform) {
    return pos(transform.offset_x + transform.mult_x * p.x, transform.offset_y + transform.mult_y * p.y);
}

function applyLinearTransformInverse(p, transform) {
    return pos((p.x - transform.offset_x) / transform.mult_x, (p.y - transform.offset_y) / transform.mult_y);
}

function computeLinearTransform(from_rect, to_rect) {
    mult_x = to_rect.width / from_rect.width;
    offset_x = to_rect.x - mult_x * from_rect.x;
    mult_y = to_rect.height / from_rect.height;
    offset_y = to_rect.y - mult_y * from_rect.y;
    return linearTransform(mult_x, offset_x, mult_y, offset_y);
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
    return rect(left, top, right-left, bottom-top);
}

function pointInRect( p, rect ) {
    var left = Math.min(rect.x, rect.x + rect.width);
    var right = Math.max(rect.x, rect.x + rect.width);
    var top = Math.min(rect.y, rect.y + rect.height);
    var bottom = Math.max(rect.y, rect.y + rect.height);
    return p.x > left && p.x < right && p.y > top && p.y < bottom;
}
