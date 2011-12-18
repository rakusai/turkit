
/**
 * You probably want to just use the global variable <code>traceManager</code>.
 * 
 * @class The TraceManager manages a sort of stack frame that is memoized on
 *        disk (using the JavaScript database associated with the current file).
 *        All stack frames are memoized, so the result is a sort of stack tree.
 * 
 * <p>
 * <code>traceManager</code> is a global instance of this class.
 * </p>
 */
function TraceManager() {
	this.stackFramePath = ["__stackFrames", "for-real"]
	this.stackIndexes = [0]
	this.visitedStackFrames = {}
	this.beforePushFrame = true
}

/**
 * Pushes a new stack frame onto the memoized stack.
 */
TraceManager.prototype.pushFrame = function(frameName) {
	this.beforePushFrame = false
	if (frameName) {
		this.stackFramePath.push("namedFrames")
		this.stackFramePath.push(frameName)
	} else {
		this.stackFramePath.push("sequencialFrames")
		this.stackFramePath
				.push(this.stackIndexes[this.stackIndexes.length - 1]++)
	}
	this.stackIndexes.push(0)

	var path = json(this.stackFramePath)

	// make sure we haven't already been here
	if (this.visitedStackFrames[path]) {
		throw new java.lang.Exception("visiting the same stack frame twice: " + path)
	}
	this.visitedStackFrames[path] = true

	return database.queryRaw("prune(ensure(null, " + path + ", " + json({
				creationTime : time()
			}) + "))")
}

/**
 * Returns the frame we would see if we called pushFrame.
 */
TraceManager.prototype.peekFrame = function(frameName) {
	if (frameName) {
		this.stackFramePath.push("namedFrames")
		this.stackFramePath.push(frameName)
	} else {
		this.stackFramePath.push("sequencialFrames")
		this.stackFramePath
				.push(this.stackIndexes[this.stackIndexes.length - 1])
	}
	this.stackIndexes.push(0)

	var path = json(this.stackFramePath)

	var ret = database.queryRaw("prune(ensure(null, " + path + ", " + json({}) + "))")
	
	this.stackFramePath.pop()
	this.stackFramePath.pop()
	this.stackIndexes.pop()
	
	return ret
}

/**
 * Sets the value of a "local variable" in the current memoized stack frame.
 * This value is persisted in the memoized stack.
 */
TraceManager.prototype.setFrameValue = function(name, value) {
	database.query("ensure(null, " + json(this.stackFramePath.concat(["values"]))
			+ ")[" + json(name) + "] = " + json(value))
}

/**
 * Gets the value of a "local variable" in the current memoized stack frame.
 */
TraceManager.prototype.getFrameValue = function(name) {
	database.queryRaw("ensure(null, "
			+ json(this.stackFramePath.concat(["values"])) + ")[" + json(name)
			+ "]")
}

/**
 * Pops the top stack frame off of the memoized stack. Note that this does not
 * remove anything from the memoized stack. The memoized stack is a tree which
 * stores a trace of every stack frame that ever went onto the stack.
 */
TraceManager.prototype.popFrame = function() {
	this.stackFramePath.pop()
	this.stackFramePath.pop()
	this.stackIndexes.pop()
}

/**
 * Calls the function <i>func</i> only once; subsequent runs of the program
 * will not call <i>func</i> if it returns successfully this time. If <i>func</i>
 * throws an exception, then it will be called again when the program is
 * re-executed.
 * 
 * <p>
 * This function creates a new memoized stack frame before calling <i>func</i>.
 * You can give this stack frame a name as an optional second parameter
 * <i>frameName</i>.
 * </p>
 */
TraceManager.prototype.once = function(func, frameName) {
	var frame = this.pushFrame(frameName)
	try {
		if ("onceFunc" in frame) {
			if (frame.onceFunc != "" + func) {
				throw new java.lang.Exception("The memoized stack is inconsistent with the program. The program is running: " + func + "\nBut on a previous run, it ran: " + frame.onceFunc) 
			}
		} else {
			database.query("merge(ensure(null, " + json(this.stackFramePath)
					+ "), " + json({onceFunc : "" + func}) + ")")
		}
	
		if ("returnValue" in frame) {
			frame.returnValue = database.queryRaw("ensure(null, "
					+ json(this.stackFramePath) + ").returnValue")
			if ("printOutput" in frame) {
				Packages.java.lang.System.out["print(java.lang.String)"](frame.printOutput)
			}
		} else {
			var wireTap = new Packages.edu.mit.csail.uid.turkit.util.WireTap()
			var returnValue = func()
			var printOutput = wireTap.close()
			var returnTime = time()		
			frame = {
				returnValue : returnValue,
				returnTime : returnTime,
				printOutput : printOutput
			}
			database.query("merge(ensure(null, " + json(this.stackFramePath)
					+ "), " + json(frame) + ")")
		}
	} finally {
		this.popFrame()
	}
	return frame.returnValue
}

/**
 * This is a wrapper around {@link TraceManager#once}.
 */
function once(func, frameName) {
	return traceManager.once(func, frameName)
}

/**
 * Calls the function <i>func</i> in a new memoized stack frame, and catches
 * the "stop" exception. Returns <code>true</code> if the call succeeds.
 * Returns <code>false</code> if <i>func</i> throws a "stop" exception (see
 * {@link TraceManager#stop}).
 */
TraceManager.prototype.attempt = function(func, frameName) {
	this.pushFrame(frameName)
	try {
		func()
	} catch (e) {
		if ("" + e == "stop") {
			return false
		} else {
			rethrow(e)
		}
	} finally {
		this.popFrame()
	}
	return true
}

/**
 * This is a wrapper around {@link TraceManager#attempt}.
 */
function attempt(func, frameName) {
	return traceManager.attempt(func, frameName)
}

/**
 * Sets the root of the memoized stack frame tree. Calling this method with a
 * new value for <i>traceName</i> has the effect of reseting all calls to
 * {@link TraceManager#once}, so that they re-execute their functions.
 */
TraceManager.prototype.setTrace = function(traceName) {
	if (!this.beforePushFrame) {
		throw new java.lang.Exception("you may not call setTrace from within a once or attempt, or after pushing a frame")
	}
	if (!traceName) {
		throw new java.lang.Exception("you must provide an identifier or version number of some sort")
	}
	this.stackFramePath[1] = "for-real:" + traceName
}

/**
 * Wrapper around {@link TraceManager#setTrace}
 */
function setTrace(traceName) {
	return traceManager.setTrace(traceName)
}

/**
 * Similar to {@link TraceManager#setTrace}, except that it clears the memoized
 * stack frame data for all other trace versions.
 */
TraceManager.prototype.resetTrace = function(traceName) {
	if (!this.beforePushFrame) {
		throw new java.lang.Exception("you may not call resetTrace from within a once or attempt, or after pushing a frame")
	}
	if (!traceName) {
		throw new java.lang.Exception("you must provide an identifier or version number of some sort")
	}
	this.stackFramePath[1] = "for-real:" + traceName
	database.query("var a = " + this.stackFramePath[0]
			+ "; foreach(a, function (v, k) {if (k != "
			+ json(this.stackFramePath[1]) + ") {delete a[k]}})")
}

/**
 * Wrapper around {@link TraceManager#resetTrace}.
 */
function resetTrace(traceName) {
	return traceManager.resetTrace(traceName)
}

/**
 * Throws a "stop" exception. This is the preferred way of stopping execution in
 * order to wait on HITs on Mechanical Turk. Note that the "stop" exception is
 * caught by {@link TraceManager#attempt}.
 */
TraceManager.prototype.stop = function() {
	javaTurKit.stopped = true
	throw "stop"
}

/**
 * Wrapper around {@link TraceManager#stop}.
 */
function stop() {
	return traceManager.stop()
}

/**
 * This is a pointer to the {@link TraceManager}. You probably want to use
 * this, and not create another TraceManager.
 */
var traceManager = new TraceManager()
