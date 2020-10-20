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
    var earth_mass = 5.972e24; // kg
    var earth_radius = 6371e3; // m
    var moon_distance = 384400e3; // m
    var d = pointMassFreeFallDistance(3.0, earth_mass, earth_radius);
    console.log("Distance fallen near Earth's surface in 3 seconds =",d,'m');
    var t = pointMassFreeFallTime(earth_radius, earth_radius - d, earth_mass);
    console.log("Time taken to fall",d,"m near Earth's surface =",t,'s');
    var d2 = pointMassFreeFallDistance(3.0, earth_mass, moon_distance);
    console.log("Distance fallen towards Earth from Moon's orbit distance in 3 seconds =",d2,'m');
    var t2 = pointMassFreeFallTime(moon_distance, moon_distance - d2, earth_mass);
    console.log("Time taken to fall",d2,"m towards Earth from Moon's orbit distance =",t2,'s');
    var t3 = pointMassFreeFallTime(moon_distance, earth_radius, earth_mass);
    console.log("Time taken to fall",moon_distance-earth_radius,"m to Earth from Moon's orbit distance =",t3,'s, or',t3/(60.0*60.0*24.0),'days');
    var d3 = pointMassFreeFallDistance(t3, earth_mass, moon_distance);
    console.log("Distance fallen towards Earth from Moon's orbit distance in",t3,"seconds =",d3,'m');

    // draw free-fall trajectory
    var h1 = moon_distance;
    var h2 = earth_radius;
    var fall_time = pointMassFreeFallTime(h1, h2, earth_mass);
    var n_steps = 100;
    var time_step = fall_time / n_steps;
    var size = 400;
    var offset = 10;
    ctx.moveTo(offset,offset);
    for(var i = 1; i <= n_steps; i++) {
        var time = i * time_step;
        var fallen_distance = pointMassFreeFallDistance(time, earth_mass, h1);
        var x = i * size / n_steps;
        var y = size * fallen_distance / (h1-h2);
        ctx.lineTo(x+offset,y+offset);
    }
    ctx.stroke();
    
    // draw axes
    ctx.moveTo(offset,offset);
    ctx.lineTo(offset,offset+size);
    ctx.lineTo(offset+size,offset+size);
    ctx.stroke();
    
    ctx.fillText("time",offset+size,offset+size);
    ctx.fillText("height",offset,offset);
}

function pointMassFreeFallDistance(time, planet_mass, initial_height) {
    /*
    The code below should work but it doesn't give the correct results - what has gone wrong?
    // following https://en.wikipedia.org/wiki/Free_fall#Inverse-square_law_gravitational_field
    var G = 6.674e-11; // universal gravitational constant
    var mu = G * planet_mass; // standard gravitational parameter
    var x = Math.pow( (3.0/2.0) * ( (Math.PI/2.0) - time*Math.sqrt( (2.0*mu) / Math.pow(initial_height, 3.0) ) ), 2.0/3.0 );
    return initial_height * ( x - (1.0/5.0)*x*x - (3.0/175.0)*x*x*x - (23.0/7875.0)*x*x*x*x - (1894.0/3931875.0)*x*x*x*x*x ); // plus more terms?
    */

    // so we solve numerically instead by bisection on the function pointMassFreeFallTime()
    var low_final_height_estimate = initial_height;
    var high_final_height_estimate = 0.0;
    var mid_final_height_estimate = (low_final_height_estimate + high_final_height_estimate)/2.0;
    var t_low = pointMassFreeFallTime(initial_height, low_final_height_estimate, planet_mass);
    var t_mid = pointMassFreeFallTime(initial_height, mid_final_height_estimate, planet_mass);
    var t_high = pointMassFreeFallTime(initial_height, high_final_height_estimate, planet_mass);
    var i = 0;
    while(i++ < 100 && t_high-t_low > 1e-4) {
        if(time < t_mid) {
            high_final_height_estimate = mid_final_height_estimate;
            t_high = t_mid;
        }
        else {
            low_final_height_estimate = mid_final_height_estimate;
            t_low = t_mid;
        }
        mid_final_height_estimate = (low_final_height_estimate + high_final_height_estimate)/2.0;
        t_mid = pointMassFreeFallTime(initial_height, mid_final_height_estimate, planet_mass);
    }
    var estimated_fall_distance = initial_height - mid_final_height_estimate;
    return estimated_fall_distance;
}

function pointMassFreeFallTime(initial_height, final_height, planet_mass) {
    // following https://en.wikipedia.org/wiki/Free_fall#Inverse-square_law_gravitational_field
    var G = 6.674e-11; // universal gravitational constant
    var mu = G * planet_mass; // standard gravitational parameter
    return Math.sqrt( Math.pow(initial_height,3.0)/(2.0*mu) ) *
        ( Math.sqrt((final_height/initial_height)*(1.0-(final_height/initial_height))) +
          Math.acos(Math.sqrt(final_height/initial_height)) );
}

window.onload = init;
