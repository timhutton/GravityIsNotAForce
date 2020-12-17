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

function findInitialHeight(time, final_height, planet_mass, max_possible_height = 1e15) {
    // Return the height you started from given that you reached final_height in the given time.
    return bisection_search(time, final_height, max_possible_height, 200,
        initial_height => freeFallTime(initial_height, final_height, planet_mass));
}

function freeFallDistance(time, initial_height, planet_mass) {
    // Return the distance you will fall from initial_height in the given time.
    return initial_height - bisection_search(time, initial_height, 0, 200,
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

function minimumSpeedElliptic(x_0, x, planet_mass) {
    // returns the minimum speed at x_0 for the trajectory to be able to reach x at any time
    const mu = universal_gravitational_constant * planet_mass; // standard gravitational parameter
    if(2 * mu * (1 / x_0 - 1 / x) < 0) {
        throw new Error("2 * mu * (1 / x_0 - 1 / x) < 0 in minimumSpeedElliptic");
    }
    return Math.sqrt(2 * mu * (1 / x_0 - 1 / x));
}

function hasPeak(x_0, v_0, planet_mass) {
    const mu = universal_gravitational_constant * planet_mass; // standard gravitational parameter
    const w = 1 / x_0 - v_0 * v_0 / (2 * mu);
    return w > 0;
}

function peakHeight(x_0, v_0, planet_mass) {
    const mu = universal_gravitational_constant * planet_mass; // standard gravitational parameter
    const w = 1 / x_0 - v_0 * v_0 / (2 * mu);
    if(w > 0) {
        // w is positive => elliptic (below escape velocity)
        const peak = 1 / w;
        return peak;
    }
    throw new Error("Trajectory has no peak in peakHeight");
}

function parabolicOrbitCollisionTimeFromMuX(mu, x) {
    // Following https://en.wikipedia.org/wiki/Radial_trajectory#Parabolic_trajectory
    if(2 * Math.pow(x, 3) / (9 * mu) < 0) {
        throw new Error("2 * Math.pow(x, 3) / (9 * mu) < 0 in parabolicOrbitCollisionTimeFromMuX");
    }
    return Math.sqrt(2 * Math.pow(x, 3) / (9 * mu));
}

function ellipticOrbitCollisionTimeFromMuXW(mu, x, w) {
    // Following https://en.wikipedia.org/wiki/Radial_trajectory#Elliptic_trajectory
    if(2 * mu * Math.pow(w, 3) <= 0) {
        throw new Error("2 * mu * Math.pow(w, 3) <= 0 in ellipticOrbitCollisionTimeFromMuXW");
    }
    if(w * x * (1 - w * x) < 0) {
        throw new Error("w * x * (1 - w * x) < 0 in ellipticOrbitCollisionTimeFromMuXW");
    }
    if(w * x < 0) {
        throw new Error("w * x < 0 in ellipticOrbitCollisionTimeFromMuXW");
    }
    return (Math.asin(Math.sqrt(w * x)) - Math.sqrt(w * x * (1 - w * x))) / Math.sqrt(2 * mu * Math.pow(w, 3));
}

function hyperbolicOrbitCollisionTimeFromMuXAbsW(mu, x, absw) {
    // Following https://en.wikipedia.org/wiki/Radial_trajectory#Hyperbolic_trajectory
    if(2 * mu * Math.pow(absw, 3) <= 0) {
        throw new Error("2 * mu * Math.pow(absw, 3) <= 0 in hyperbolicOrbitCollisionTimeFromMuXAbsW");
    }
    if(Math.pow(absw * x, 2) + absw * x < 0) {
        throw new Error("Math.pow(absw * x, 2) + absw * x < 0 in hyperbolicOrbitCollisionTimeFromMuXAbsW");
    }
    if(1 + absw * x < 0) {
        throw new Error("1 + absw * x < 0 in hyperbolicOrbitCollisionTimeFromMuXAbsW");
    }
    if(Math.sqrt(absw * x) + Math.sqrt(1 + absw * x) <= 0) {
        throw new Error("Math.sqrt(absw * x) + Math.sqrt(1 + absw * x <= 0 in hyperbolicOrbitCollisionTimeFromMuXAbsW");
    }
    return (Math.sqrt(Math.pow(absw * x, 2) + absw * x) - Math.log(Math.sqrt(absw * x) + Math.sqrt(1 + absw * x)))
           / Math.sqrt(2 * mu * Math.pow(absw, 3));
}

function escapeVelocity(x_0, planet_mass) {
    // Following https://en.wikipedia.org/wiki/Radial_trajectory#Time_as_a_function_of_distance
    const mu = universal_gravitational_constant * planet_mass; // standard gravitational parameter
    if(x_0 === 0) {
        throw new Error("x_0 === 0 in escapeVelocity");
    }
    return Math.sqrt((2 * mu) / x_0);
}

function collisionTimes(x_0, v_0, t_0, x, planet_mass) {
    if(x < 0) throw new Error("x must be positive: "+x.toFixed(4));
    // x_0, v_0 define a radial trajectory in terms of a height and speed at some point in time
    // the function returns the time for two point masses at separation x to collide
    // (for elliptic trajectories, there may be two such times, depending on the initial motion of the particle)
    // Following https://en.wikipedia.org/wiki/Radial_trajectory#Time_as_a_function_of_distance
    const mu = universal_gravitational_constant * planet_mass; // standard gravitational parameter
    const w = 1 / x_0 - v_0 * v_0 / (2 * mu);
    const absw = Math.abs(w);
    if(absw < 1e-14) {
        // w is zero => parabolic (at escape velocity)
        const abs_t = parabolicOrbitCollisionTimeFromMuX(mu, x);
        const abs_t_0 = parabolicOrbitCollisionTimeFromMuX(mu, x_0);
        const t = abs_t - abs_t_0 + t_0;
        return { t:[t], orbit:'parabolic' };
    }
    else if(w > 0) {
        const peak = 1 / w;
        if(w * x > 1) {
            console.log("mu =", mu);
            console.log("v_0 =", v_0);
            console.log("x_0 =", x_0);
            console.log("x =", x);
            console.log("w =", w);
            console.log("w * x * (1 - w * x) =", w * x * (1 - w * x));
            throw new Error("insufficient speed to reach target altitude, w * x > 1, w * x =" + (w * x).toFixed(6));
            //return { t:[], orbit:'elliptic, failed to reach '+x.toFixed(4)+', peak = '+peak.toFixed(4) }
        }
        // w is positive => elliptic (below escape velocity)
        const abs_t = ellipticOrbitCollisionTimeFromMuXW(mu, x, w);
        const abs_t_0 = ellipticOrbitCollisionTimeFromMuXW(mu, x_0, w);
        const abs_peak_time = ellipticOrbitCollisionTimeFromMuXW(mu, peak, w);
        let t1 = abs_t - abs_t_0 + t_0;
        const peak_time = abs_peak_time - abs_t_0 + t_0;
        let t2 = 2 * peak_time - t1;
        if(isNaN(t1) || isNaN(t2)) {
            console.log("NaN");
            console.log("v_0 =", v_0);
            console.log("x_0 =", x_0);
            console.log("x =", x);
            console.log("w =", w);
            console.log("w * x * (1 - w * x) =", w * x * (1 - w * x));
        }
        if(v_0 < 0) {
            // equations don't allow for negative velocities at x_0
            const t2_mirrored = t_0 + t_0 - t2;
            const t1_mirrored = t_0 + t_0 - t1;
            t1 = t2_mirrored;
            t2 = t1_mirrored;
        }
        return { t:[t1, t2], peak:new P(peak_time, peak), orbit:'elliptic' };
    }
    else {
        // w is negative => hyperbolic (above escape velocity)
        const abs_t = hyperbolicOrbitCollisionTimeFromMuXAbsW(mu, x, absw);
        const abs_t_0 = hyperbolicOrbitCollisionTimeFromMuXAbsW(mu, x_0, absw);
        let t = abs_t - abs_t_0 + t_0;
        if(v_0 < 0) {
            // equations don't allow for negative velocities at x_0
            t = t_0 + t_0 - t;
        }
        return { t:[t], orbit:'hyperbolic' };
    }
}

function peakTimes(x_0, t_0, x, planet_mass) {
    // For trajectories passing through height x_0 at time t_0, return the possible times
    // that they could have reached a peak at height x
    const mu = universal_gravitational_constant * planet_mass; // standard gravitational parameter
    if(x < x_0) {
        throw new Error("x < x_0 in peakTimes");
    }
    const w_peak = 1 / x;
    if(w_peak * x > 1) {
        throw new Error("w_peak * x > 1 in peakTimes");
    }
    if(w_peak * x_0 > 1) {
        console.log("x_0 =", x_0);
        console.log("w_peak * x_0 =", w_peak * x_0);
        throw new Error("w_peak * x_0 > 1 in peakTimes");
    }
    const peak_t_abs = ellipticOrbitCollisionTimeFromMuXW(mu, x, w_peak);
    const peak_t_0 = ellipticOrbitCollisionTimeFromMuXW(mu, x_0, w_peak);
    const t_diff = peak_t_abs - peak_t_0;
    return [t_0 - t_diff, t_0 + t_diff];
}

function escapeVelocityTimes(x_0, t_0, x, planet_mass) {
    // for the trajectory from x_0, t_0 at escape velocity, at what time does it reach height x?
    // returns [negative velocity, positive velocity]
    const escape_velocity = escapeVelocity(x_0, planet_mass);
    const t = collisionTimes(x_0, escape_velocity, t_0, x, planet_mass).t[0];
    return [t_0 + t_0 - t, t];
}

function getOrbitalType(h0, t0, h1, t1, planet_mass) {
    // decide which part of the parameter space we need to search
    const t_epsilon = 1e-6;
    let orbit_type = '';
    let v0 = '';
    let peakness = '';
    if(t1 === t0) {
        if(h1 === h0) {
            throw new Error("ambiguous solution in findLaunchSpeed - start and end are the same");
        }
        throw new Error("infinite speed needed in findLaunchSpeed");
    }
    const escape_times = escapeVelocityTimes(h0, t0, h1, earth_mass);
    if(h1 >= h0) {
        const peak_times = peakTimes(h0, t0, h1, planet_mass);
        if(t1 > t0) {
            if(Math.abs(t1 - peak_times[1]) < t_epsilon) {
                orbit_type = 'elliptic';
                v0 = 'positive';
                peakness = 'at peak';
            }
            else if(t1 > peak_times[1]) {
                orbit_type = 'elliptic';
                v0 = 'positive';
                peakness = 'after peak';
            }
            else if(Math.abs(t1 - escape_times[1]) < t_epsilon) {
                orbit_type = 'parabolic';
                v0 = 'positive';
            }
            else if(t1 > escape_times[1]) {
                orbit_type = 'elliptic';
                v0 = 'positive';
                peakness = 'before peak';
            }
            else {
                orbit_type = 'hyperbolic';
                v0 = 'positive';
            }
        }
        else {
            if(Math.abs(t1 - peak_times[0]) < t_epsilon) {
                orbit_type = 'elliptic';
                v0 = 'negative';
                peakness = 'at peak';
            }
            else if(t1 < peak_times[0]) {
                orbit_type = 'elliptic';
                v0 = 'negative';
                peakness = 'before peak';
            }
            else if(Math.abs(t1 - escape_times[0]) < t_epsilon) {
                orbit_type = 'parabolic';
                v0 = 'negative';
            }
            else if(t1 < escape_times[0]) {
                orbit_type = 'elliptic';
                v0 = 'negative';
                peakness = 'after peak';
            }
            else {
                orbit_type = 'hyperbolic';
                v0 = 'negative';
            }
        }
    }
    else {
        const zero_vel_times = collisionTimes(h0, 0, t0, h1, earth_mass).t;
        if(t1 > t0) {
            if(Math.abs(t1 - zero_vel_times[1]) < t_epsilon) {
                orbit_type = 'elliptic';
                v0 = 'zero';
                peakness = 'after peak';
            }
            else if(t1 > zero_vel_times[1]) {
                orbit_type = 'elliptic';
                v0 = 'positive';
                peakness = 'after peak';
            }
            else if(Math.abs(t1 - escape_times[0]) < t_epsilon) {
                orbit_type = 'parabolic';
                v0 = 'negative';
            }
            else if(t1 > escape_times[0]) {
                orbit_type = 'elliptic';
                v0 = 'negative';
                peakness = 'after peak';
            }
            else {
                orbit_type = 'hyperbolic';
                v0 = 'negative';
            }
        }
        else {
            if(Math.abs(t1 - zero_vel_times[0]) < t_epsilon) {
                orbit_type = 'elliptic';
                v0 = 'zero';
                peakness = 'before peak';
            }
            else if(t1 < zero_vel_times[0]) {
                orbit_type = 'elliptic';
                v0 = 'negative';
                peakness = 'before peak';
            }
            else if(Math.abs(t1 - escape_times[1]) < t_epsilon) {
                orbit_type = 'parabolic';
                v0 = 'positive';
            }
            else if(t1 < escape_times[1]) {
                orbit_type = 'elliptic';
                v0 = 'positive';
                peakness = 'before peak';
            }
            else {
                orbit_type = 'hyperbolic';
                v0 = 'positive';
            }
        }
    }
    return [orbit_type, v0, peakness];
}
