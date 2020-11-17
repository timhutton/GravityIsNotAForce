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

const earth_surface_gravity = 9.8; // m/s/s
const earth_mass = 5.972e24; // kg
const earth_radius = 6371e3; // m
const moon_distance = 384400e3; // m
const light_speed = 299792458; // m/s
const earth_schwarzschild_radius = 8.87e-3; // m
const universal_gravitational_constant = 6.67430e-11; // m^3 kg^-1 s^-2

function findInitialHeight(time, final_height, planet_mass) {
    // Return the height you started from given that you reached final_height in the given time.
    return bisection_search(time, final_height, final_height + 1e10, 1e-6, 200,
        initial_height => freeFallTime(initial_height, final_height, planet_mass));
}

function freeFallDistance(time, initial_height, planet_mass) {
    // Return the distance you will fall from initial_height in the given time.
    return initial_height - bisection_search(time, initial_height, 0, 1e-6, 200,
        final_height => freeFallTime(initial_height, final_height, planet_mass));
}

function freeFallTime(initial_height, final_height, planet_mass) {
    // Return how long it will take to fall from initial_height to final_height.
    // Following https://en.wikipedia.org/wiki/Free_fall#Inverse-square_law_gravitational_field
    const mu = universal_gravitational_constant * planet_mass; // standard gravitational parameter
    return Math.sqrt( Math.pow(initial_height, 3) / (2 * mu) ) *
        ( Math.sqrt((final_height / initial_height) * (1 - (final_height / initial_height))) +
          Math.acos(Math.sqrt(final_height / initial_height)) );
}

function distanceTravelledWithConstantAcceleration(time, acceleration) {
    return 0.5 * acceleration * time * time;
}
