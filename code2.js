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
    var heights = [];//[h1, /*h2+3*(h1-h2)/4,*/ h2+(h1-h2)/2, /*h2+(h1-h2)/4, h2+(h1-h2)/8, h2+(h1-h2)/16*/ h2];
    for(var i=0;i<=10;i++) {
        heights.push(h1+i*(h2-h1)/10.0);
    }
    
    function undistort(time, final_height)
    {
        // Return the initial_height such that an inertial particle starting there at t=0
        // would hit final_height at the time given.
        // BUT - this doesn't work for the time-delayed trajectories - the blue trajectories aren't straight
        // lines (except in the parabolic regime, e.g. h1 = earth_radius+50)
        // NEED TO RETHINK
        // Need to stretch the time dimension?
        // Or is because spacetime isn't flat - need hyperbolic representation?
        return { time:Math.pow(time,1.0), height:findInitialHeight(time, final_height, earth_mass) };
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
            var st = undistort(time, h);
            var x = st.time * size / fall_time;
            h = st.height;
            var y = size - size * (h-h2) / (h1-h2);
            if(i==0) {
                ctx.moveTo(x+offset,y+offset);
            } else {
                ctx.lineTo(x+offset,y+offset);
            }
        }
    });
    ctx.stroke();
    
    // draw some other free-fall trajectories on the same distorted graph
    ctx.strokeStyle='rgb(200,100,100)'; // red: free-fall trajectories starting later
    ctx.beginPath();
    heights.forEach(initial_height => {
        for(var i = n_steps/4; i <= n_steps; i++) {
            var time_step = fall_time / n_steps;
            var time_delay = fall_time / 4;
            var time = i * time_step;
            var fallen_distance = freeFallDistance(time-time_delay, earth_mass, initial_height);
            var h = Math.max(h2, initial_height - fallen_distance);
            var x = i * size / n_steps;
            var y = size - size * (h-h2) / (h1-h2);
            if(i==n_steps/4) {
                ctx.moveTo(x+offset,y+offset);
            } else {
                ctx.lineTo(x+offset,y+offset);
            }
        }
    });
    ctx.stroke();
    ctx.strokeStyle='rgb(100,100,200)'; // blue: undistorted red trajectories
    ctx.beginPath();
    heights.forEach(initial_height => {
        for(var i = n_steps/4; i <= n_steps; i++) {
            var time_step = fall_time / n_steps;
            var time_delay = fall_time / 4;
            var time = i * time_step;
            var fallen_distance = freeFallDistance(time-time_delay, earth_mass, initial_height);
            var h = Math.max(h2, initial_height - fallen_distance);
            var st = undistort(time, h);
            var x = st.time * size / fall_time;
            h = st.height;
            var y = size - size * (h-h2) / (h1-h2);
            if(i==n_steps/4) {
                ctx.moveTo(x+offset,y+offset);
            } else {
                ctx.lineTo(x+offset,y+offset);
            }
        }
    });
    ctx.stroke();
}

function findInitialHeight(time, final_height, planet_mass) {
    // Return the height you started from given that you reached final_height in the given time.

    // we solve numerically by bisection on the function freeFallTime()
    var low_final_initial_estimate = final_height;
    var high_final_initial_estimate = final_height + 1e10;
    var mid_final_initial_estimate = (low_final_initial_estimate + high_final_initial_estimate)/2.0;
    var t_low = freeFallTime(low_final_initial_estimate, final_height, planet_mass);
    var t_mid = freeFallTime(mid_final_initial_estimate, final_height, planet_mass);
    var t_high = freeFallTime(high_final_initial_estimate, final_height, planet_mass);
    var i = 0;
    while(i++ < 100 && t_high-t_low > 1e-4) {
        if(time < t_mid) {
            high_final_initial_estimate = mid_final_initial_estimate;
            t_high = t_mid;
        }
        else {
            low_final_initial_estimate = mid_final_initial_estimate;
            t_low = t_mid;
        }
        mid_final_initial_estimate = (low_final_initial_estimate + high_final_initial_estimate)/2.0;
        t_mid = freeFallTime(mid_final_initial_estimate, final_height, planet_mass);
    }
    return mid_final_initial_estimate;
}

function freeFallDistance(time, planet_mass, initial_height) {
    // Return the distance you will fall from initial_height in the given time.
    
    /*
    The code below should work but it doesn't give the correct results - what has gone wrong?
    // following https://en.wikipedia.org/wiki/Free_fall#Inverse-square_law_gravitational_field
    var G = 6.674e-11; // universal gravitational constant
    var mu = G * planet_mass; // standard gravitational parameter
    var x = Math.pow( (3.0/2.0) * ( (Math.PI/2.0) - time*Math.sqrt( (2.0*mu) / Math.pow(initial_height, 3.0) ) ), 2.0/3.0 );
    return initial_height * ( x - (1.0/5.0)*x*x - (3.0/175.0)*x*x*x - (23.0/7875.0)*x*x*x*x - (1894.0/3931875.0)*x*x*x*x*x ); // plus more terms?
    */

    // so we solve numerically instead by bisection on the function freeFallTime()
    var low_final_height_estimate = initial_height;
    var high_final_height_estimate = 0.0;
    var mid_final_height_estimate = (low_final_height_estimate + high_final_height_estimate)/2.0;
    var t_low = freeFallTime(initial_height, low_final_height_estimate, planet_mass);
    var t_mid = freeFallTime(initial_height, mid_final_height_estimate, planet_mass);
    var t_high = freeFallTime(initial_height, high_final_height_estimate, planet_mass);
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
        t_mid = freeFallTime(initial_height, mid_final_height_estimate, planet_mass);
    }
    var estimated_fall_distance = initial_height - mid_final_height_estimate;
    return estimated_fall_distance;
}

function freeFallTime(initial_height, final_height, planet_mass) {
    // Return how long it will take to fall from initial_height to final_height.
    // Following https://en.wikipedia.org/wiki/Free_fall#Inverse-square_law_gravitational_field
    var G = 6.674e-11; // universal gravitational constant
    var mu = G * planet_mass; // standard gravitational parameter
    return Math.sqrt( Math.pow(initial_height,3.0)/(2.0*mu) ) *
        ( Math.sqrt((final_height/initial_height)*(1.0-(final_height/initial_height))) +
          Math.acos(Math.sqrt(final_height/initial_height)) );
}

window.onload = init;
