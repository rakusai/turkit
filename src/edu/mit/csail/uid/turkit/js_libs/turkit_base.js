
var verbose = javaTurKit.verbose

/**
 * This function prints <i>s</i> if and only if TurKit is in "verbose" mode.
 */
function verbosePrint(s) {
	if (verbose) {
		print(s)
	}
}

/**
 * This is a reference to the TurKit object in Java running this JavaScript
 * file.
 */
var javaTurKit = javaTurKit

/**
	This is the directory that the currently running TurKit JavaScript file is in.
 */
var baseDir = javaTurKit.jsFile.getParent()

/**
	Get a Java File object given a path relative to the {@link baseDir}.
 */
function getFile(relPath) {
	var f = new Packages.java.io.File(baseDir, relPath)
	try {
		f.getCanonicalPath()
		return f
	} catch (e) {
		// maybe it's an absolute path after all?
		f = new Packages.java.io.File(relPath)
		f.getCanonicalPath()
		return f
	}	
}

/**
	Reads the contents of the file or url indicated by <code>src</code> into a string.
 */
function read(src) {
	if ((typeof src) == "string") {
		try {
			src = getFile(src)
		} catch (e) {
			src = new Packages.java.net.URL(src)
		}
	}
	return "" + Packages.edu.mit.csail.uid.turkit.util.U.slurp(src)
}

/**
	Reads the contents of the file or url indicated by <code>src</code> into a string,
	same as {@link read}.
 */
function slurp(src) {
	return read(src)
}

/**
	Writes the contents of the string <code>s</code> to the file indicated by <code>dest</code>.
 */
function write(dest, s) {
	Packages.edu.mit.csail.uid.turkit.util.U.saveString(getFile(dest), s)
}
