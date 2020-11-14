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

class LogMemoization {
    // Memoization structure with larger intervals for larger values.
    constructor(min = 0, max = 1e15, n_values = 1000) {
        this.min = min;
        this.max = max;
        this.values = new Array(n_values);
        this.base = Math.pow(this.max - this.min, 1 / this.values.length);
    }

    getIndex(x) {
        // Return the index of the interval that contains x
        if(x < this.min || x > this.max) {
            throw new Error("getIndex: value " + x + " not in range [" + this.min + " - " + this.max + "]");
        }
        var index = Math.floor(Math.log(1 + x - this.min) / Math.log(this.base));
        return index;
    }

    getIntervalMin(index) {
        // Return the minimum value associated with this interval
        if(index < 0 || index >= this.values.length) {
            throw new Error("getIntervalMin: index " + index + " not in range [0 - " + (this.values.length-1) + "]");
        }
        var value = Math.exp(index * Math.log(this.base)) + this.min - 1;
        return value;
    }

    lookup(x) {
        // Look up the interval containing x and do linear interpolation along it
        if(x < this.min || x > this.max) {
            throw new Error("lookup: value " + x + " not in range [" + this.min + " - " + this.max + "]");
        }
        var index = this.getIndex(x);
        var value_low = this.values[index];
        if(index >= this.values.length - 1) {
            return value_low;
        }
        var value_high = this.values[index + 1];
        var x_low = this.getIntervalMin(index);
        var x_high = this.getIntervalMin(index + 1);
        return value_low + (value_high - value_low) * (x - x_low) / (x_high - x_low);
    }

    reverse_lookup(value) {
        // Find the interval containing value by binary search and do linear interpolation along it
        if(value < this.values[0] || value > this.values[this.values.length - 1]) {
            throw new Error("reverse_lookup: value not in range");
        }
        var a = 0;
        var b = this.values.length - 1;
        while(a !== b) {
            var mid = Math.floor((a + 1 + b) / 2);
            var value_mid = this.values[mid];
            if(value_mid > value) {
                b = mid - 1;
            }
            else {
                a = mid;
            }
        }
        var index = a;
        var x_low = this.getIntervalMin(index);
        var x_high = this.getIntervalMin(index + 1);
        var value_low = this.values[index];
        var value_high = this.values[index + 1];
        return x_low + (x_high - x_low) * (value - value_low) / (value_high - value_low);
    }
}
