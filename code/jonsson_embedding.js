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

// Following http://www.relativitet.se/Webarticles/2001GRG-Jonsson33p1207.pdf

class JonssonEmbedding {
    constructor(sin_theta_zero = 0.8, delta_tau_real = 1) {
        // Pick the shape of funnel we want: (Eq. 46)
        this.sin_theta_zero = sin_theta_zero; // angle of slope at the bottom
        this.r_0 = 1; // radius at the bottom
        this.delta_tau_real = delta_tau_real; // proper time per circumference, in seconds
        // Precompute some values
        this.x_0 = earth_radius / earth_schwarzschild_radius;
        this.sqr_x_0 = Math.pow(this.x_0, 2);
        this.a_e0 = 1 - 1 / this.x_0; // (Eq. 14, because using exterior metric)
        // Precompute other values that depend on the funnel shape
        this.computeShapeParameters();
    }
    
    setSlopeAngle(val) {
        val = Math.min(0.999, Math.max(0.001, val)); // clamp to valid range
        this.sin_theta_zero = val;
        this.computeShapeParameters();
    }

    setTimeWrapping(val) {
        val = Math.max(1e-6, val); // clamp to valid range
        this.delta_tau_real = val;
        this.computeShapeParameters();
    }

    computeShapeParameters() {
        // Compute k, delta and alpha (Eq. 47)
        this.k = this.delta_tau_real * light_speed / ( 2 * Math.PI * Math.sqrt(this.a_e0) * earth_schwarzschild_radius );
        this.delta = Math.pow(this.k / ( 2 * this.sin_theta_zero * this.sqr_x_0 ), 2);
        this.alpha = Math.pow(this.r_0, 2) / ( 4 * Math.pow(this.x_0, 4) * Math.pow(this.sin_theta_zero, 2) + Math.pow(this.k, 2) );
        // Precompute other values
        this.sqrt_alpha = Math.sqrt(this.alpha);
        this.k2_over_4x04 = Math.pow(this.k, 2) / ( 4 * Math.pow(this.x_0, 4) );
    }

    getRadiusFromDeltaX(delta_x) {
        // compute the radius at this point (Eg. 48)
        return this.k * this.sqrt_alpha / Math.sqrt( delta_x / this.sqr_x_0 + this.delta );
    }
    
    getDeltaZFromDeltaX(delta_x, delta_x_0 = 0, delta_z_0 = 0) {
        // integrate over x between delta_x_0 and delta_x to find delta_z (Eg. 49)
        return delta_z_0 + this.sqrt_alpha * simpsons_integrate( delta_x_0, delta_x, 1000,
            x => {
                var term1 = 1 / ( x / this.sqr_x_0 + this.delta );
                return term1 * Math.sqrt( 1 - this.k2_over_4x04 * term1 );
            });
    }
    
    getDeltaXFromDeltaZ(delta_z) {
        // inverse of above getDeltaZFromDeltaX, using bisection search
        var delta_x_max = this.getDeltaXFromSpace(earth_radius * 100);
        return bisection_search(delta_z, 0, delta_x_max, 1e-6, 100, delta_x => this.getDeltaZFromDeltaX(delta_x));
    }
    
    getDeltaXFromSpace(x) {
        return x / earth_schwarzschild_radius - this.x_0;
    }
    
    getSpaceFromDeltaX(delta_x) {
        return (delta_x + this.x_0) * earth_schwarzschild_radius;
    }
    
    getAngleFromTime(t) {
        return 2 * Math.PI * t / this.delta_tau_real; // convert time in seconds to angle in radians
    }
    
    getAngleFromEmbeddingPoint(p) {
        return Math.atan2(p.y, p.x);
    }
    
    getTimeDeltaFromAngleDelta(angle_delta) {
        return angle_delta * this.delta_tau_real / (2 * Math.PI);
    }
    
    getEmbeddingPointFromSpacetime(p) {
        var theta = this.getAngleFromTime(p.x);
        var delta_x = this.getDeltaXFromSpace(p.y);

        var radius = this.getRadiusFromDeltaX(delta_x);
        var delta_z = this.getDeltaZFromDeltaX(delta_x);
        
        return new P(radius * Math.cos(theta), radius * Math.sin(theta), delta_z);
    }
    
    getSurfaceNormalFromDeltaXAndTheta(delta_x, theta) {
        var term1 = delta_x / this.sqr_x_0 + this.delta;
        var dr_dx = - this.k * this.sqrt_alpha / (2 * this.sqr_x_0 * Math.pow(term1, 3 / 2)); // derivative of Eq. 48 wrt. delta_x
        var dz_dx = this.sqrt_alpha * Math.sqrt(1 - this.k2_over_4x04 / term1) / term1; // from Eq. 49
        var dz_dr = dz_dx / dr_dx;
        var normal = normalize(new P(-dz_dr, 0, 1)); // in the XZ plane
        return rotateXY(normal, theta);
    }
    
    getSurfaceNormalFromSpacetime(p) {
        var theta = this.getAngleFromTime(p.x);
        var delta_x = this.getDeltaXFromSpace(p.y);
        return this.getSurfaceNormalFromDeltaXAndTheta(delta_x, theta);
    }
    
    getSurfaceNormalFromEmbeddingPoint(p) {
        var delta_x = getDeltaXFromDeltaZ(p.z);
        var theta = getAngleFromEmbeddingPoint(p);
        return this.getSurfaceNormalFromDeltaXAndTheta(delta_x, theta);
    }
    
    getGeodesicPoints(a, b, max_points) {
        // Walk along the embedding following the geodesic until we hit delta_x = 0 or have enough points
        var ja = this.getEmbeddingPointFromSpacetime(a);
        var jb = this.getEmbeddingPointFromSpacetime(b);
        var pts = [a, b];
        for(var iPt = 0; iPt < max_points; iPt++) {
            var n = this.getSurfaceNormalFromSpacetime(b);
            var incoming_segment = sub(jb, ja);
            var norm_vec = normalize(cross(incoming_segment, n));
            // we rotate ja around norm_vec through jb, at an angle theta somewhere between 90 degrees and 270 degrees
            // such that the new point lies on the funnel
            var theta = bisection_search(0, Math.PI / 2, 3 * Math.PI / 2, 1e-6, 200, theta => {
                var jc = rotateAroundPointAndVector(ja, jb, norm_vec, theta);
                // decide if this point is inside or outside the funnel
                var actual_radius = len(new P(jc.x, jc.y));
                var delta_z = Math.max(0, jc.z); // not sure what to do if jc.z < 0 here
                var delta_x = this.getDeltaXFromDeltaZ(delta_z);
                var expected_radius = this.getRadiusFromDeltaX(delta_x);
                return expected_radius - actual_radius;
            });
            var jc = rotateAroundPointAndVector(ja, jb, norm_vec, theta);
            if( jc.z < 0 ) { 
                // have hit the edge of the embedding
                break;
            }
            // convert to spacetime coordinates
            var delta_x = this.getDeltaXFromDeltaZ(jc.z);
            var delta_theta = signedAngleBetweenTwoPointsXY(jb, jc);
            var delta_time = this.getTimeDeltaFromAngleDelta(delta_theta);
            var c = new P(b.x + delta_time, this.getSpaceFromDeltaX(delta_x));
            pts.push(c);
            ja = jb;
            jb = jc;
            b = c;
        }
        return pts;
    }
}
