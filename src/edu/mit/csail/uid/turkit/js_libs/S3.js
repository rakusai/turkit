
/**
 * You probably want to use the global variable <code>s3</code>.
 * 
 * @class S3 contains wrappers around the JetS3t API for accessing Amazon's S3 storage service.
 * 
 * <p>
 * <code>s3</code> is a global instance of the S3 class.
 * </p>
 */
function S3() {
	this.defaultBucketName = javaTurKit.awsAccessKeyID + ".TurKit"
}

/**
 * The default name used for buckets: <code>your-aws-access-key-id.TurKit</code>.
 */
S3.prototype.defaultBucketName = null

/**
	Creates an S3 URL given a <code>bucket</code> and a <code>key</code>.
 */
S3.prototype.getURL = function(bucket, key) {
	return "http://s3.amazonaws.com/" + bucket + "/" + key
}

/**
	Extracts the bucket name and key from an S3 URL. For instance, given <code>http://s3.amazonaws.com/hello/hi.txt</code>,
	returns <code>{bucket:"hello", key:"hi.txt"}</code>.
 */
S3.prototype.getBucketAndKey = function(url) {
    var a = url.match(/http:\/\/s3\.amazonaws\.com\/([^\/]+)\/(.*)/)
    if (!a) {
        a = url.match(/http:\/\/([^\/]+)\.s3\.amazonaws\.com\/(.*)/)
        if (!a) return
    }
    return {bucket : a[1], key : a[2]}
}

/**
	Remove the object with the given <code>key</code> from the bucket with the given <code>bucketName</code>.
	If only one parameter is supplied, it assumes it is an S3 URL, and attempts to extract the bucket name and key from that.
	
	<p><code>bucketName</code> is optional.
	If you do not provide it, the name {@link S3#defaultBucketName} will be used.</p>
 */
S3.prototype.deleteObjectRaw = function(bucketName, key) {

	if (javaTurKit.mode == "offline") throw "Not allowed in offline mode."

	if (!bucketName) {
		bucketName = this.defaultBucketName
	}
	if (!key) {
		var a = this.getBucketAndKey(bucketName)
		bucketName = a.bucket
		key = a.key
	}

	Packages.edu.mit.csail.uid.turkit.S3.deleteObject(
		javaTurKit.awsAccessKeyID, javaTurKit.awsSecretAccessKey,
		bucketName, key)
	
	var url = this.getURL(bucketName, key)
	verbosePrint("deleted S3 object at: " + url)
	database.query("delete __S3_Objects[" + json(url) + "]")	
}

/**
 * Calls {@link S3#deleteObjectRaw} inside of {@link TraceManager#once}.
 */
S3.prototype.deleteObject = function(bucketName, key) {
	return once(function() {
				return s3.deleteObjectRaw(bucketName, key)
			})
}

/**
	Create a public object in S3 based on the suplied data.
	Returns the URL for the object.

	This function will create the bucket if it doesn't exist.
	
	<p><code>bucketName</code> is optional.
	If you do not provide it, the name {@link S3#defaultBucketName} will be used.</p>
	
	<p><code>key</code> is optional.
	If you do not provide it, the key will be a random string of characters
	with an .html extension.</p>
	
	<p>If there is only 1 parameter, it will be interpreted as <code>stringData</code>.</p>
 */
S3.prototype.putObjectRaw = function(bucketName, key, data) {
	if (javaTurKit.mode == "offline") throw "Not allowed in offline mode."
	
	if (!data && !key && bucketName) {
		return this.putObjectRaw(null, null, bucketName)
	}
	if (!bucketName) {
		bucketName = this.defaultBucketName
	}
	if (!key) {
		key = Packages.edu.mit.csail.uid.turkit.util.U.getRandomString(32, "0123456789abcdefghijklmnopqrstuvwxyz") + ".html"
	}
	
	Packages.edu.mit.csail.uid.turkit.S3.putObject(
		javaTurKit.awsAccessKeyID, javaTurKit.awsSecretAccessKey,
		bucketName, key, data)
		
	var url = this.getURL(bucketName, key) 
	database.query("ensure(null, ['__S3_Objects', " + json(url) + "], " + json({}) + ")")
	if (verbose) {
		print("S3 object put at: " + url)
	}
		
	return url
}

/**
 * Calls {@link S3#putObjectRaw} inside of {@link TraceManager#once}.
 */
S3.prototype.putObject = function(bucketName, s3Object) {
	return once(function() {
				return s3.putObjectRaw(bucketName, s3Object)
			})
}

/**
	Create a public object in S3 based on a string.
	Returns the URL for the object.
	
	<p><code>bucketName</code> is optional.
	If you do not provide it, the name {@link S3#defaultBucketName} will be used.</p>
	
	<p><code>key</code> is optional.
	If you do not provide it, the key will be a random string of characters
	with an .html extension.</p>
	
	<p>If there is only 1 parameter, it will be interpreted as <code>stringData</code>.</p>
 */
S3.prototype.putStringRaw = function(bucketName, key, stringData) {
	return this.putObjectRaw(bucketName, key, stringData)
}

/**
 * Calls {@link S3#putStringRaw} inside of {@link TraceManager#once}.
 */
S3.prototype.putString = function(bucketName, key, stringData) {
	return once(function() {
				return s3.putStringRaw(bucketName, key, stringData)
			})
}

/**
	Create a public object in S3 based on a file.
	The name given to this object will be randomly generated.
	Returns the URL for the object.
	
	<p><code>bucketName</code> is optional.
	If you do not provide it, the name {@link S3#defaultBucketName} will be used.</p>
	
	<p>If there is only 1 parameter, it will be interpreted as <code>file</code>.</p>
 */
S3.prototype.putFileRaw = function(bucketName, file) {

	if (javaTurKit.mode == "offline") throw "Not allowed in offline mode."
	
	if (!file && bucketName) {
		return this.putFileRaw(null, bucketName)
	}
	if (!bucketName) {
		bucketName = this.defaultBucketName
	}
	
	if ((typeof file) == "string") {
		file = getFile(file)
	}
	
	var key = Packages.edu.mit.csail.uid.turkit.util.U.getRandomString(32, "0123456789abcdefghijklmnopqrstuvwxyz")

	// add the original extension, if there was one
	var m = file.getName().match(/\.([^\.]+)$/)
	if (m) key += '.' + m[1]
	
	return this.putObjectRaw(bucketName, key, file)
}

/**
 * Calls {@link S3#putFileRaw} inside of {@link TraceManager#once}.
 */
S3.prototype.putFile = function(bucketName, file) {
	return once(function() {
				return s3.putFileRaw(bucketName, file)
			})
}

/**
 * A reference to an {@link S3} object.
 * 
 * @return {S3}
 */
s3 = new S3()
