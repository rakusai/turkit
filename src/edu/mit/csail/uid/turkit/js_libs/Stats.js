
/**
 * Utility methods for doing statistics. More to come here in the future.
 */
function Stats() {
}

/**
 * Calculate the sum of an array
 */
Stats.sum = function (a) {
	return fold(a, function (x, y) { return x + y }, 0)
}

/**
	Calculate the mean of an array.
	<code>sum</code> is optional -- it will be calculated if not supplied. 
 */
Stats.mean = function (a, sum) {
	if (!(a instanceof Array)) a = values(a)
	if (sum === undefined) {
		sum = Stats.sum(a)
	}
	return sum / a.length
}

/**
	Calculate the variance of an array.
	<code>mean</code> is optional -- it will be calculated if not supplied. 
 */
Stats.variance = function (a, mean) {
	if (!(a instanceof Array)) a = values(a)
	if (!mean) {
		mean = Stats.mean(a)
	}
	return fold(a, function (x, y) {
		return Math.pow(x - mean, 2) + y
	}, 0) / (a.length - 1)
}

/**
	Calculate the standard deviation of an array.
	<code>mean</code> is optional -- it will be calculated if not supplied. 
 */
Stats.sd = function (a, mean) {
	return Math.sqrt(Stats.variance(a, mean))
}

/**
	Calculate the sum, mean, variance and standard deviation of <code>a</code>.
 */
Stats.all = function (a) {
	if (!(a instanceof Array)) a = values(a)
	var ret = {}
	ret.sum = Stats.sum(a)
	ret.mean = Stats.mean(a, ret.sum)
	ret.variance = Stats.variance(a, ret.mean)
	ret.sd = Math.sqrt(ret.variance)
	return ret
}
