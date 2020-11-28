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

// Following http://www.relativitet.se/Webarticles/2001GRG-Jonsson33p1207.pdf, addendum

class JonssonEmbedding {
    constructor() {
        this.min_space = earth_radius;
        this.max_space = 1e15;
        // Precompute some values
        this.x_0 = this.getXFromSpace(earth_radius);
        const R = 2; // (Section 1.4 in addendum)
        // Compute beta (Eq. 7 in addendum)
        const a_00 = Math.pow(3 * Math.sqrt(1 - 1 / this.x_0) - 1, 2) / 4; // (here a_0(0) is for the *interior* metric)
        this.beta = a_00 * (Math.pow(R, 2) - 1) / (Math.pow(R, 2) - a_00);
        // Compute k (Eq. 8 in addendum)
        this.k = 2 * Math.pow(this.x_0, 7 / 4) / Math.sqrt(3 * Math.sqrt(this.x_0 - 1) - Math.sqrt(this.x_0));
        // Compute alpha (from section 1.3 in addendum)
        this.alpha = (1 - this.beta) / Math.pow(this.k, 2);
        // Compute delta_t_real (using Eq. 12 from addendum)
        this.delta_t_real = 2 * Math.PI * Math.sqrt(Math.pow(earth_radius, 3) / (earth_mass * universal_gravitational_constant));

        // Precompute other values
        this.sqrt_alpha = Math.sqrt(this.alpha);
        this.sqrt_beta = Math.sqrt(this.beta);
        this.precomputeMemoization();
    }

    getRadiusFromX(x) {
        const a_0 = 1 - 1 / x; // (Eq. 14, for the exterior metric)
        return this.k * Math.sqrt(this.alpha * a_0 / (a_0 - this.beta)); // (Eq. 21)
    }

    getDeltaZFromX(x) {
        // use linear interpolation into the lookup table
        return this.memoize_getDeltaZFromX.lookup(x);
    }

    get_dz_dx(x) {
        // From Eq. 25
        const a_0 = 1 - 1 / x; // (Eq. 14, because using exterior metric)
        const d_a_0_dx = 1 / Math.pow(x, 2);
        const c_0 = - 1 / a_0; // (Eq. 14, because using exterior metric)
        const term1 = Math.pow(a_0 - this.beta, 2);
        const term2 = Math.pow(this.k, 2) * this.beta / 4;
        const term3 = a_0 * Math.pow(a_0 - this.beta, 3);
        const term4 = - c_0 / term1 - term2 * Math.pow(d_a_0_dx, 2) / term3;
        const term5 = Math.sqrt(term4);
        return this.sqrt_alpha * this.sqrt_beta * term5;
    }

    computeDeltaZFromX(x, x_lower, delta_z_0) {
        // integrate over x between x_lower and x to find delta_z (Eg. 25)
        return delta_z_0 + simpsons_integrate( x_lower, x, 1000, x => this.get_dz_dx(x));
    }

    getXFromDeltaZ(delta_z) {
        // use linear interpolation into the lookup table
        return this.memoize_getDeltaZFromX.reverse_lookup(delta_z);
    }

    getXFromSpace(x) {
        return x / earth_schwarzschild_radius;  // (Section 2.3 says that all x are dimensionless in this way)
    }

    getSpaceFromX(x) {
        return x * earth_schwarzschild_radius; // convert back to meters
    }

    getAngleFromTime(t) {
        return 2 * Math.PI * t / this.delta_t_real; // convert time in seconds to angle in radians
    }

    getAngleFromEmbeddingPoint(p) {
        return Math.atan2(p.y, p.x);
    }

    getTimeDeltaFromAngleDelta(angle_delta) {
        return angle_delta * this.delta_t_real / (2 * Math.PI);
    }

    getEmbeddingPointFromSpacetime(p) {
        const x = this.getXFromSpace(p.y);
        const theta = this.getAngleFromTime(p.x);
        return this.getEmbeddingPointFromXAndTheta(x, theta);
    }

    getEmbeddingPointFromXAndTheta(x, theta) {
        const radius = this.getRadiusFromX(x);
        const delta_z = this.getDeltaZFromX(x);
        return new P(radius * Math.cos(theta), radius * Math.sin(theta), delta_z);
    }

    getSurfaceNormalFromXAndTheta(x, theta) {
        // Find dr/dx by taking the derivative of Eq. 21 (with Eq. 14, because using exterior metric) wrt x
        const term1 = (this.beta - 1) * x + 1;
        const dr_dx = - this.alpha * this.beta * this.k / (2 * Math.pow(term1, 2) * Math.sqrt(this.alpha * (1 - x) / term1));

        const dz_dx = this.get_dz_dx(x);

        const dz_dr = dz_dx / dr_dx;
        const normal = normalize(new P(-dz_dr, 0, 1)); // in the XZ plane
        return rotateXY(normal, theta);
    }

    getSurfaceNormalFromSpacetime(p) {
        const theta = this.getAngleFromTime(p.x);
        const x = this.getXFromSpace(p.y);
        return this.getSurfaceNormalFromXAndTheta(x, theta);
    }

    getSurfaceNormalFromEmbeddingPoint(p) {
        const x = getXFromDeltaZ(p.z);
        const theta = getAngleFromEmbeddingPoint(p);
        return this.getSurfaceNormalFromXAndTheta(x, theta);
    }

    getGeodesicPoints(a, b, max_points) {
        // Walk along the embedding following the geodesic until we hit delta_z = 0 or have enough points
        let ja = this.getEmbeddingPointFromSpacetime(a);
        let jb = this.getEmbeddingPointFromSpacetime(b);
        let pts = [a, b];
        for(let iPt = 0; iPt < max_points; iPt++) {
            const n = this.getSurfaceNormalFromSpacetime(b);
            const incoming_segment = sub(jb, ja);
            const norm_vec = normalize(cross(incoming_segment, n));
            // we rotate ja around norm_vec through jb, at an angle theta somewhere between 90 degrees and 270 degrees
            // such that the new point lies on the funnel
            const theta = bisection_search(0, Math.PI / 2, 3 * Math.PI / 2, 1e-6, 200, theta => {
                const jc = rotateAroundPointAndVector(ja, jb, norm_vec, theta);
                // decide if this point is inside or outside the funnel
                const actual_radius = len(new P(jc.x, jc.y));
                const delta_z = Math.max(0, jc.z); // not sure what to do if jc.z < 0 here
                const x = this.getXFromDeltaZ(delta_z);
                const expected_radius = this.getRadiusFromX(x);
                return expected_radius - actual_radius; // signed distance to the funnel surface
            });
            const jc = rotateAroundPointAndVector(ja, jb, norm_vec, theta);
            if( jc.z < 0 ) {
                // have hit the edge of the embedding
                break;
            }
            // convert to spacetime coordinates
            const x = this.getXFromDeltaZ(jc.z);
            const delta_theta = signedAngleBetweenTwoPointsXY(jb, jc);
            const delta_time = this.getTimeDeltaFromAngleDelta(delta_theta);
            const c = new P(b.x + delta_time, this.getSpaceFromX(x));
            pts.push(c);
            ja = jb;
            jb = jc;
            b = c;
        }
        return pts;
    }

    precomputeMemoization() {
        // Memoize getDeltaZFromX
        this.min_x = this.getXFromSpace(this.min_space);
        this.max_x = this.getXFromSpace(this.max_space);
        this.memoize_getDeltaZFromX = new LogMemoization(this.min_x, this.max_x, 1000);
        let last_x = this.min_x;
        let last_delta_z = 0;
        this.min_delta_z = last_delta_z;
        this.memoize_getDeltaZFromX.values[0] = last_delta_z;
        for(let i = 1; i < this.memoize_getDeltaZFromX.values.length; i++) {
            const x = this.memoize_getDeltaZFromX.getIntervalMin(i);
            const delta_z = this.computeDeltaZFromX(x, last_x, last_delta_z);
            this.memoize_getDeltaZFromX.values[i] = delta_z;
            last_x = x;
            last_delta_z = delta_z;
        }
        this.max_x = last_x;
        this.max_delta_z = last_delta_z;
    }
}
