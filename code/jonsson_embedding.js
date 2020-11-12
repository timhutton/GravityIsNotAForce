// Following http://www.relativitet.se/Webarticles/2001GRG-Jonsson33p1207.pdf

class JonssonEmbedding {
    constructor() {
        // Pick the shape of funnel we want: (Eq. 46)
        this.sin_theta_zero = 0.8; // angle of slope at the bottom (controlled by a slider)
        this.r_0 = 1; // radius at the bottom
        this.delta_tau_real = 1; // proper time per circumference, in seconds (controlled by a slider)
        this.x_0 = earth_radius / earth_schwarzschild_radius;
        this.sqr_x_0 = Math.pow(this.x_0, 2);
        this.a_e0 = 1 - 1 / this.x_0; // (Eq. 14, because using exterior metric)
        this.computeJonssonShapeParameters();
    }
    
    setSlopeAngle(val) {
        this.sin_theta_zero = val;
        this.computeJonssonShapeParameters();
    }

    setTimeWrapping(val) {
        this.delta_tau_real = val;
        this.computeJonssonShapeParameters();
    }

    computeJonssonShapeParameters() {
        // Compute k, delta and alpha (Eq. 47)
        this.k = this.delta_tau_real * light_speed / ( 2 * Math.PI * Math.sqrt(this.a_e0) * earth_schwarzschild_radius );
        this.delta = Math.pow(this.k / ( 2 * this.sin_theta_zero * this.sqr_x_0 ), 2);
        this.alpha = Math.pow(this.r_0, 2) / ( 4 * Math.pow(this.x_0, 4) * Math.pow(this.sin_theta_zero, 2) + Math.pow(this.k, 2) );
        this.sqrt_alpha = Math.sqrt(this.alpha);
    }

    getRadiusFromDeltaX(delta_x) {
        // compute the radius at this point (Eg. 48)
        return this.k * this.sqrt_alpha / Math.sqrt( delta_x / this.sqr_x_0 + this.delta );
    }
    
    getDeltaZFromDeltaX(delta_x) {
        // integrate over x to find delta_z (Eg. 49)
        var term1 = Math.pow(this.k, 2) / ( 4 * Math.pow(this.x_0, 4) );
        return this.sqrt_alpha * simpsons_integrate( 0, delta_x, 1000,
            x => {
                var term2 = 1 / ( x / this.sqr_x_0 + this.delta );
                return term2 * Math.sqrt( 1 - term1 * term2 );
            });
    }
    
    getEmbeddingPointFromSpacetime(p) {
        var theta = 2 * Math.PI * p.x / this.delta_tau_real; // convert time in seconds to angle
        var x = p.y / earth_schwarzschild_radius;
        var delta_x = x - this.x_0;

        var radius = this.getRadiusFromDeltaX(delta_x);
        var delta_z = this.getDeltaZFromDeltaX(delta_x);
        
        return new P(radius * Math.cos(theta), radius * Math.sin(theta), delta_z);
    }
    
    getSurfaceNormalFromDeltaXAndTheta(delta_x, theta) {
        var term1 = delta_x / this.sqr_x_0 + this.delta;
        var dr_dx = - this.k * this.sqrt_alpha / (2 * this.sqr_x_0 * Math.pow(term1, 3 / 2)); // derivative of Eq. 48 wrt. delta_x
        var dz_dx = this.sqrt_alpha * Math.sqrt(1 - Math.pow(this.k, 2) / (4 * Math.pow(this.x_0, 4) * term1)) / term1; // from Eq. 49
        var dz_dr = dz_dx / dr_dx;
        var normal = normalize(new P(-dz_dr, 0, 1)); // in the XZ plane
        return rotateXY(normal, theta);
    }
    
    getSurfaceNormalFromSpacetime(p) {
        var theta = 2 * Math.PI * p.x / this.delta_tau_real; // convert time in seconds to angle
        var x = p.y / earth_schwarzschild_radius;
        var delta_x = x - this.x_0;
        return this.getSurfaceNormalFromDeltaXAndTheta(delta_x, theta);
    }
    
    getSurfaceNormalFromEmbeddingPoint(p) {
        var delta_z = p.z;
        var delta_x = getDeltaXFromDeltaZ(delta_z);
        var theta = Math.atan2(p.y, p.x);
        return this.getSurfaceNormalFromDeltaXAndTheta(delta_x, theta);
    }
    
    getDeltaXFromDeltaZ(delta_z) {
        var delta_x_max = earth_radius * 2 / earth_schwarzschild_radius - this.x_0;
        return bisection_search(delta_z, 0, delta_x_max, 1e-6, 100, delta_x => this.getDeltaZFromDeltaX(delta_x));
    }
    
    getGeodesicPoints(a, b, max_points) {
        // Walk along the embedding following the geodesic until we hit delta_x = 0 or have enough points
        var ja = this.getEmbeddingPointFromSpacetime(a);
        var jb = this.getEmbeddingPointFromSpacetime(b);
        var pts = [ja, jb]; // TODO: eventually we want the spacetime coordinates for the points, not the embedding ones
        for(var iPt = 0; iPt < max_points; iPt++) {
            var n = this.getSurfaceNormalFromEmbeddingPoint(jb);
            var incoming_segment = sub(jb, ja);
            var norm_vec = normalize(cross(incoming_segment, n));
            var theta = bisection_search(0, Math.PI / 2 , 3 * Math.PI / 2, 1e-6, 200, theta => {
                var jc = rotateAroundPointAndVector(ja, jb, norm_vec, theta);
                // decide if this point is inside or outside the funnel
                var actual_radius = len(new P(jc.x, jc.y));
                var delta_z = Math.max(0, jc.z); // not sure what to do here
                var delta_x = this.getDeltaXFromDeltaZ(delta_z);
                var expected_radius = this.getRadiusFromDeltaX(delta_x);
                return expected_radius - actual_radius;
            });
            var jc = rotateAroundPointAndVector(ja, jb, norm_vec, theta);
            if( jc.z < 0 ) { 
                console.log('jc.z < 0');
                break;
            }
            pts.push(jc);
            ja = jb;
            jb = jc;
            // TODO: find the spacetime coordinates that correspond to this point on the embedding
        }
        return pts;
    }
}

/*
function testEmbeddingByPathLengths() {
    // generate trajectories that start and end at the same points, for different values of g
    // measure their arc length on the embedding - the one for the correct g should be the shortest
    var time_to_fall = 1; // pick a time
    for(var dm = -earth_mass *0.7; dm < earth_mass / 2; dm += earth_mass / 20) {
        var planet_mass = earth_mass + dm;
        var h = findInitialHeight(time_to_fall, earth_radius, planet_mass);
        var pts = getFreeFallPoints(0, h, earth_radius, planet_mass, 100).map(JonssonEmbedding);
        var length = 0;
        for(var iPt = 1; iPt < pts.length; iPt++) {
            length += dist(pts[iPt], pts[iPt-1]);
        }
        console.log(dm, h, length);
    }
    throw new Error(); // to stop the rest of the script
}

function testEmbeddingByPathTurning() {
    // generate trajectories that start and end at the same points, for different values of g
    // measure how much they deviate from the plane that includes the surface normal
    var time_to_fall = 1; // pick a time
    [-earth_mass * 0.1, 0, earth_mass * 0.1].forEach( dm => {
        var planet_mass = earth_mass + dm;
        var h = findInitialHeight(time_to_fall, earth_radius, planet_mass);
        var pts = getFreeFallPoints(0, h, earth_radius, planet_mass, 200);
        var sum_turns = 0;
        var sum_abs_turns = 0;
        for(var iPt = 1; iPt < pts.length-1; iPt++) {
            var p = JonssonEmbedding(pts[iPt]);
            var n = JonssonEmbeddingSurfaceNormal(pts[iPt]);
            var pre = JonssonEmbedding(pts[iPt-1]);
            var post = JonssonEmbedding(pts[iPt+1]);
            var incoming_segment = sub(p, pre);
            var outgoing_segment = sub(post, p);
            var norm_vec = normalize(cross(incoming_segment, n));
            var turning_angle = Math.asin(dot(outgoing_segment, norm_vec) / len(outgoing_segment));
            sum_turns += turning_angle;
            sum_abs_turns += Math.abs(turning_angle);
            console.log(dm, turning_angle);
        }
    });
    throw new Error(); // to stop the rest of the script
}
*/