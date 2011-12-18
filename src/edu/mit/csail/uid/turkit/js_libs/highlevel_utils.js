
/**
 * Use this instead of <code>Math.random()</code>. This is not just a
 * shorthand. It is important that TurKit programs run the same way each time
 * they are executed. This function wraps <code>Math.random()</code> inside a
 * call to {@link TraceManager#once}.
 */
function random() {
	return once(function() {
				return Math.random()
			})
}

/**
 * Randomizes the order of the elements in <i>a</i>.
 */
function shuffle(a) {
	for (var i = 0; i < a.length; i++) {
		var ii = Math.floor(random() * a.length)
		var temp = a[i]
		a[i] = a[ii]
		a[ii] = temp
	}
	return a
}

/**
	<p>Creates a webpage, puts it on S3, and returns the URL.
	The webpage represents a HIT.
	The webpage is created by starting with a <a href="/src/resources/task-template.html">template HTML page</a>.
	The <code>html</code> supplied to this function in injected into the template.
	The S3 webpage is made publicly accessible.
	The URL to the S3 webpage is returned.
	You can pass the URL to <code>s3.deleteObject</code> to remove it.</p>
	
	<p>If you supply an array or comma-delimited-string for <code>blockWorkers</code>,
	then the html page will use JavaScript to prevent those workers from completing the HIT.</p>
	<p>If you give any elements the class "random", then those elements will be randomly permuted each time a user views the page.
	This is good for randomizing the choices in voting tasks.</p>
	
	<p><code>bucketName</code> is optional.
	If you do not provide it, the name {@link S3#defaultBucketName} will be used.</p>
	*/
function createWebpageFromTemplate(html, blockWorkers, bucketName) {
	if (!bucketName) {
		bucketName = s3.defaultBucketName
	}
	
	if (!blockWorkers) {
		blockWorkers = ""
	} else if (blockWorkers instanceof Array) {
		blockWorkers = blockWorkers.join(",")
	}
	
	var s = ("" + javaTurKit.taskTemplate).
		replace(/___CONTENT___/, html).
		replace(/___BLOCK_WORKERS___/, blockWorkers)
	createWebpageFromTemplate_html = s
	return s3.putString(bucketName, null, s)
}

/**
 * Changes the mode. Possible values include "offline", "sandbox" and "real".
 * <ul>
 * <li>"offline" will not let you access MTurk or S3.</li>
 * <li>"sandbox" will let you access the MTurk sandbox, and the real S3.</li>
 * <li>"real" mode accesses the real MTurk and the real S3.</li>
 * </ul>
 */
function setMode(mode) {
	javaTurKit.setMode(mode)
	mturk = new MTurk()
	s3 = new S3()
}
