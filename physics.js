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

var earth_surface_gravity = 9.8; // metres per second per second
var earth_mass = 5.972e24; // kg
var earth_radius = 6371e3; // m
var moon_distance = 384400e3; // m

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
    var maxits = 100;
    var epsilon = 1e-6;
    while(i++ < maxits && Math.abs(high_final_initial_estimate-low_final_initial_estimate) > epsilon) {
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
    if(i>=maxits) {
        console.log('ERROR: maximum iterations exceeded in bisection:');
        console.log(time, t_low, t_mid, t_high, initial_t_low, initial_t_high);
    }
    return mid_final_initial_estimate;
}

function freeFallDistance(time, initial_height, planet_mass) {
    // Return the distance you will fall from initial_height in the given time.
    
    /*
    The code below should work but it doesn't give the correct results - what has gone wrong?
    // following https://en.wikipedia.org/wiki/Free_fall#Inverse-square_law_gravitational_field
    var G = 6.674e-11; // universal gravitational constant
    var mu = G * planet_mass; // standard gravitational parameter
    var x = Math.pow( (3.0/2.0) * ( (Math.PI/2.0) - time*Math.sqrt( (2.0*mu) / Math.pow(initial_height, 3.0) ) ), 2.0/3.0 );
    return initial_height * ( x - (1.0/5.0)*x*x - (3.0/175.0)*x*x*x - (23.0/7875.0)*x*x*x*x - (1894.0/3931875.0)*x*x*x*x*x );
    // will only work with more terms?
    */

    // so we solve numerically instead by bisection on the function freeFallTime()
    var low_final_height_estimate = initial_height;
    var high_final_height_estimate = 0.0;
    var mid_final_height_estimate = (low_final_height_estimate + high_final_height_estimate)/2.0;
    var t_low = freeFallTime(initial_height, low_final_height_estimate, planet_mass);
    var t_mid = freeFallTime(initial_height, mid_final_height_estimate, planet_mass);
    var t_high = freeFallTime(initial_height, high_final_height_estimate, planet_mass);
    var i = 0;
    var maxits = 100;
    var epsilon = 1e-6;
    var initial_t_high = t_high;
    var initial_t_low = t_low;
    while(i++ < maxits && Math.abs(high_final_height_estimate-low_final_height_estimate) > epsilon) {
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
    if(i>=maxits) {
        console.log('ERROR: maximum iterations exceeded in bisection:');
        console.log(time, t_low, t_mid, t_high, initial_t_low, initial_t_high);
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

function distanceTravelledWithConstantAcceleration(time, acceleration) {
    return 0.5 * acceleration * time * time;
}
