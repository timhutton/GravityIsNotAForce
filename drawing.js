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

function drawLine(pts, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for(var i=1;i<pts.length;i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
}

function drawCircle(p, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
    ctx.fill();
}

function drawSpacedCircles(pts, r, color, nth=20) {
    for(var i=0;i<pts.length;i+=nth) {
        drawCircle(pts[i], r, color);
    }
}

// adapted from http://stackoverflow.com/a/6333775/126823
function drawArrowHead( a, b, size ) {
    var angle = Math.atan2(b.y-a.y,b.x-a.x);
    ctx.beginPath();
    ctx.moveTo(b.x - size * Math.cos(angle - Math.PI/6), b.y - size * Math.sin(angle - Math.PI/6));
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(b.x - size * Math.cos(angle + Math.PI/6), b.y - size * Math.sin(angle + Math.PI/6));
    ctx.stroke();
}

function drawText(p, text) {
    ctx.fillText(text, p.x, p.y);
}
