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

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    // debugging
    var d = freeFallDistance(3.0, earth_mass, earth_radius);
    console.log("Distance fallen near Earth's surface in 3 seconds =",d,'m');
    var t = freeFallTime(earth_radius + d, earth_radius, earth_mass);
    console.log("Time taken to fall",d,"m near Earth's surface =",t,'s');
    var h = findInitialHeight(t, earth_radius, earth_mass);
    console.log("Initial height to reach Earth in ",t,"s =",h-earth_radius,'m above Earth');
    var tx = freeFallTime(earth_radius, 0, earth_mass);
    console.log("Time taken to fall",earth_radius,"m near Earth's surface =",tx,'s');
    var d2 = freeFallDistance(3.0, earth_mass, moon_distance);
    console.log("Distance fallen towards Earth from Moon's orbit distance in 3 seconds =",d2,'m');
    var t2 = freeFallTime(moon_distance, moon_distance - d2, earth_mass);
    console.log("Time taken to fall",d2,"m towards Earth from Moon's orbit distance =",t2,'s');
    var t3 = freeFallTime(moon_distance, earth_radius, earth_mass);
    console.log("Time taken to fall",moon_distance-earth_radius,"m to Earth from Moon's orbit distance =",t3,'s, or',t3/(60.0*60.0*24.0),'days');
    var d3 = freeFallDistance(t3, earth_mass, moon_distance);
    console.log("Distance fallen towards Earth from Moon's orbit distance in",t3,"seconds =",d3,'m');
    
    var h1 = moon_distance;
    //var h1 = earth_radius*4;
    //var h1 = earth_radius+5000000;
    //var h1 = earth_radius+50;
    var h2 = earth_radius;
    var fall_time = freeFallTime(h1, h2, earth_mass);
    var size = 400;
    var offset = 10;
    var heights = [];
    for(var i=0;i<=10;i++) {
        heights.push(h1+i*(h2-h1)/10.0);
    }
    
    function undistort(time, final_height)
    {
        // Return the initial_height such that an inertial particle starting there at t=0
        // would hit final_height at the time given.
        return findInitialHeight(time, final_height, earth_mass);
    }

    // draw axes
    ctx.strokeStyle = 'rgb(150,150,150)';
    ctx.beginPath();
    ctx.moveTo(offset,offset);
    ctx.lineTo(offset,offset+size);
    ctx.lineTo(offset+size,offset+size);
    ctx.stroke();  
    ctx.fillText("time",offset+size,offset+size);
    ctx.fillText("height",offset,offset);

    // draw free-fall trajectories
    ctx.strokeStyle = 'rgb(0,0,0)'; // black: free-fall trajectories starting at t=0
    ctx.beginPath();
    var n_steps = 500;
    heights.forEach(initial_height => {
        for(var i = 0; i <= n_steps; i++) {
            var time_step = fall_time / n_steps;
            var time = i * time_step;
            var fallen_distance = freeFallDistance(time, earth_mass, initial_height);
            var h = Math.max(h2, initial_height - fallen_distance);
            var x = i * size / n_steps;
            var y = size - size * (h-h2) / (h1-h2);
            if(i==0) {
                ctx.moveTo(x+offset,y+offset);
            } else {
                ctx.lineTo(x+offset,y+offset);
            }
        }
    });
    ctx.stroke();

    // also draw the spacetime-warped versions
    ctx.strokeStyle='rgb(100,200,100)'; // green: undistorted trajectories
    ctx.beginPath();
    heights.forEach(initial_height => {
        for(var i = 0; i <= n_steps; i++) {
            var time_step = fall_time / n_steps;
            var time = i * time_step;
            var fallen_distance = freeFallDistance(time, earth_mass, initial_height);
            var h = Math.max(h2, initial_height - fallen_distance);
            h = undistort(time, h);
            var x = time * size / fall_time;
            var y = size - size * (h-h2) / (h1-h2);
            if(i==0) {
                ctx.moveTo(x+offset,y+offset);
            } else {
                ctx.lineTo(x+offset,y+offset);
            }
        }
    });
    ctx.stroke();
}

window.onload = init;
