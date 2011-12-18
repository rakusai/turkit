
/**
 * You probably want to use the global variable <code>mturk</code>.
 * 
 * @class MTurk contains wrappers around the Java API for accessing Mechanical
 *        Turk.
 * 
 * <p>
 * <code>mturk</code> is a global instance of the MTurk class.
 * </p>
 */
function MTurk() {
}

/*
 * Throw an exception if we cannot spend the given amount of <i>money</i>, or
 * create the given number of <i>hits</i>, without violating our safety limits.
 * The <i>callbackBeforeCrash</i> will be called before an exception is thrown,
 * if an exception is about to be thrown.
 */
MTurk.prototype.assertWeCanSpend = function(money, hits, callbackBeforeCrash) {
	if (!javaTurKit.safety)
		return

	var safety = {
		moneySpent : 0,
		hitsCreated : 0
	}
	safety = database.query("return ensure('__safetyCounters', " + json(safety)
			+ ")")
	safety.moneySpent += money
	safety.hitsCreated += hits
	if (safety.moneySpent > javaTurKit.maxMoney) {
		if (callbackBeforeCrash)
			callbackBeforeCrash()
		throw new java.lang.Exception("TurKit has detected a safety violation: spending too much money. "
				+ "You need to increase your spending limit with TurKit (not with MTurk) to overcome this problem.")
	}
	if (safety.hitsCreated > javaTurKit.maxHITs) {
		if (callbackBeforeCrash)
			callbackBeforeCrash()
		throw new java.lang.Exception("TurKit has detected a safety violation: creating too many HITs. "
				+ "You need to increase your hit limit with TurKit (not with MTurk) to overcome this problem.")
	}
	safety = database.query("__safetyCounters = " + json(safety))
}

/**
 * Returns the number of dollars in the user's MTurk account.
 */
MTurk.prototype.getAccountBalance = function() {
	var x = new XML(javaTurKit.soapRequest("GetAccountBalance", ""))
	if ('' + x..Request.IsValid != "True") throw "GetAccountBalance failed: " + x
	return parseFloat(x..AvailableBalance.Amount)
}
/**
 * Creates a HIT. <i>params</i> is an object with the following properties:
 * <ul>
 * <li><b>title</b>: displayed in the list of HITs on MTurk.</li>
 * <li><b>description</b>: <b>desc</b> is also accepted. A slightly longer
 * description of the HIT, also shown in the list of HITs on MTurk</li>
 * <li><b>question</b>: a string of XML specifying what will be shown. <a
 * href="http://docs.amazonwebservices.com/AWSMechanicalTurkRequester/2008-08-02/index.html?ApiReference_QuestionFormDataStructureArticle.html">See
 * documentation here</a>. Instead of <i>question</i>, you may use the following special parameters:
 <ul>
 <li><b>url</b>: creates an external question pointing to this URL</li>
 <li><b>height</b>: (optional) height of the iFrame embedded in MTurk, in pixels (default is 600).</li>
 </ul>
 
 </li>
 * <li><b>reward</b>: how many dollars you want to pay per assignment for this
 * HIT.
 * </ul>
 * The following properties are optional:
 * <ul>
 * <li><b>keywords</b>: keywords to help people search for your HIT.</li>
 * <li><b>assignmentDurationInSeconds</b>: default is 1 hour's worth of
 * seconds.</li>
 * <li><b>autoApprovalDelayInSeconds</b>: default is 1 month's worth of
 * seconds.</li>
 * <li><b>lifetimeInSeconds</b>: default is 1 week's worth of seconds.</li>
 * <li><b>maxAssignments</b>: <b>assignments</b> is also accepted. default is 1.</li>
 * <li><b>requesterAnnotation</b>: default is no annotation.</li>
 * <li><b>qualificationRequirements</b>: an array of objects representing the XML structure of SOAP requirements for including qualification requirements (default is no requirements).</li>
 * <li><b>minApproval</b>: minimum approval percentage. The appropriate
 * requirement will be added if you supply a percentage here.</li>
 * </ul>
 */
MTurk.prototype.createHITRaw = function(params) {
	if (!params)
		params = {}
		
	// let them know if they provide param names that are not on the list
	var badKeys = keys(new Set(keys(params)).remove([
		"title",
		"desc",
		"description",
		"reward",
		"assignmentDurationInSeconds",
		"minApproval",
		"html",
		"bucket",
		"url",
		"blockWorkers",
		"height",
		"question",
		"lifetimeInSeconds",
		"assignments",
		"maxAssignments",
		"numAssignments",
		"autoApprovalDelayInSeconds",
		"requesterAnnotation",
		"keywords",
		"qualificationRequirements",
	]))
	if (badKeys.length > 0) {
		throw new java.lang.Exception("some parameters to createHIT are not understood: " + badKeys.join(', '))
	}

	if (!params.title)
		throw new java.lang.Exception("createHIT requires a title")

	if (params.desc)
		params.description = params.desc
	if (!params.description)
		throw new java.lang.Exception("createHIT requires a description")

	if (params.reward == null)
		throw new java.lang.Exception("createHIT requires a reward")

	if (!params.assignmentDurationInSeconds)
		params.assignmentDurationInSeconds = 60 * 60 // one hour

	if(typeOf(params.qualificationRequirements) == "object"){
		//the qualification is an object and not an array
		var temp = params.qualificationRequirements
		var q = ensure(params, "qualificationRequirements", [])
		q.push(temp);
		
	}

	if (params.minApproval) {
		var q = ensure(params, "qualificationRequirements", [])
		q.push({"QualificationTypeId": "000000000000000000L0", "Comparator":"GreaterThanOrEqualTo", "IntegerValue": ""+params.minApproval})		
	}
	

	if (params.html) {
		if (!params.bucket) {
			params.bucket = javaTurKit.awsAccessKeyID.toLowerCase() + "-turkit"
		}
		var s = ("" + javaTurKit.taskTemplate).replace(/\[\[\[CONTENT\]\]\]/, params.html)
		var key = Packages.edu.mit.csail.uid.turkit.util.U.md5(s) + ".html"
		params.url = s3.putString(params.bucket, key, s)
		
		if (params.blockWorkers) {
			if ((typeof params.blockWorkers) != "string") {
				params.blockWorkers = params.blockWorkers.join(",")
			}
			params.url += "?blockWorkers=" + params.blockWorkers
		}
	}
	
	if (params.url) {
		if (!params.height)
			params.height = 600

		params.question = '<ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd">'
				+ '<ExternalURL>'
				+ escapeXml(params.url)
				+ '</ExternalURL>'
				+ '<FrameHeight>'
				+ params.height
				+ '</FrameHeight>'
				+ '</ExternalQuestion>'
	}

	if (!params.question)
		throw new java.lang.Exception("createHIT requires a question (or a url, or html)")

	if (!params.lifetimeInSeconds)
		params.lifetimeInSeconds = 60 * 60 * 24 * 7 // one week
		
	if (params.assignments)
		params.maxAssignments = params.assignments
	if (params.numAssignments)
		params.maxAssignments = params.numAssignments 
	if (!params.maxAssignments)
		params.maxAssignments = 1

	if (!params.autoApprovalDelayInSeconds)
		params.autoApprovalDelayInSeconds = null

	if (javaTurKit.safety) {
		if (params.hitTypeId) {
			ensure(params, 'responseGroup', []).push('HITDetail')
		} else {
			this.assertWeCanSpend(params.reward * params.maxAssignments, 1)
		}
	}

	if (!params.requesterAnnotation)
		params.requesterAnnotation = null

	if (!params.responseGroup)
		params.responseGroup = null

	if (!params.qualificationRequirements)
		params.qualificationRequirements = null
		
	var XMLstring = XMLtags(
			"Title", params.title,
			"Description", params.description,
			"Question", params.question,
			"AssignmentDurationInSeconds", params.assignmentDurationInSeconds,
			"LifetimeInSeconds", params.lifetimeInSeconds,
			"Keywords", params.keywords,
			"MaxAssignments", params.maxAssignments,
			"AutoApprovalDelayInSeconds", params.autoApprovalDelayInSeconds,
			"RequesterAnnotation", params.requesterAnnotation	
	)
	XMLstring = XMLstring + XMLstringFromObjs({"Amount": ""+params.reward, "CurrencyCode":"USD"},"Reward")
	
	//add qualification requirements
	
	XMLstring = XMLstring + (params.qualificationRequirements ? XMLstringFromObjs(params.qualificationRequirements, "QualificationRequirement") : "")
	
	var x = new XML(javaTurKit.soapRequest("CreateHIT", XMLstring))
	
	if ('' + x..Request.IsValid != "True") throw "Failed to create HIT: " + XMLstring
	var hit = x..HIT

	var hitId = this.tryToGetHITId(hit)
	
	verbosePrint("created HIT: " + hitId)
	var url = (javaTurKit.mode == "sandbox"
					? "https://workersandbox.mturk.com/mturk/preview?groupId="
					: "https://www.mturk.com/mturk/preview?groupId=")
			+ hit.HITTypeId
	verbosePrint("        url: " + url)
	database.query("ensure(null, ['__HITs', " + json(javaTurKit.mode + ":" + hitId) + "], " + json({url : url}) + ")")
	return hitId
}

var XMLtag = function(parent, child){
		var x = "<"+parent+">"	
		x = x + escapeXml("" + child)
		x = x + "</"+parent+">"
		return x	
}

var XMLtags = function(paramsList){
    if (typeOf(paramsList) == "array")
        arguments = paramsList
    
		var x = ""	
		for (var i = 0; i < arguments.length; i += 2) {
			x= x+ XMLtag(arguments[i], arguments[i + 1]);
		}
		return x	
}

/*
This function makes a string that looks like XML, although it has no header or namespace meta-data 
Objects can either be an associative array specifying all the tags and values the XML will have
or an array of objects.

Values can either be a string (Value), or (recursively) an object or array of objects to make into XML.

Wrapper is an optional string parameter.  If you want *each* objects in the array wrapped in an tag 
(such as you would want with multiple qualification requirements), the wrapper in the parent tag text.

Example:
var t = [
	{"LocaleValue" : {"Country": "US"}, "Comparator" : "EqualTo", "QualificationTypeId": "000071"},
	{"LocaleValue" : {"Country": "AR"}, "Comparator" : "EqualTo", "QualificationTypeId": "000072"}
		]

console.log(XMLstringFromObjs(t, "QualificationRequirement"))

*/
var XMLstringFromObjs = function(objects, wrapper){
	var x = "";
	var openWrapper = ""
	var closeWrapper = ""
	if(wrapper){
		var openWrapper = "<"+wrapper+">"	
		var closeWrapper = "</"+wrapper+">"	
	}	
	
	//put all the objects in an array
	var arr = []

	if(typeOf(objects) == "object"){
		arr.push(objects)
	}else{
		arr = objects
	}

	for(var i = 0; i< arr.length; i++){
		var thisObject = arr[i];
		var y = ""
		if(wrapper){
			y = y + openWrapper	
		}
		for(key in thisObject){
			
						
			var openTag = "<"+key+">"	
			var closeTag = "</"+key+">"	
			y = y + openTag
			var thisValue = thisObject[key]
			if(typeof(thisValue)!= "object"){
				y = y + thisValue	
			}else{			
				y = y + XMLstringFromObjs(thisObject[key], "")
				
			}
			y = y + closeTag			
		}
		if(wrapper){
			y = y + closeWrapper	
		}
		x = x + y
	}
	
	return x;
}

function typeOf(obj) {
  if ( typeof(obj) == 'object' )
    if (obj.length)
      return 'array';
    else
      return 'object';
    else
		return typeof(obj);
}

/**
 * Calls {@link MTurk#createHITRaw} inside of {@link TraceManager#once}.
 */
MTurk.prototype.createHIT = function(params) {
	return once(function() {
				return mturk.createHITRaw(params)
			})
}

/**
 * Returns a list of HIT Ids of HITs that are ready to be reviewed.
 * You may optionally specify <code>maxPages</code>,
 * to limit the number of pages of results returned.
 * Each page will have up to 100 reviewable HIT Ids.
 * If <code>maxPages</code> is specified,
 * then the return value will have a property called <code>totalNumResults</code>,
 * which indicates how many HITs are reviewable.
 */
MTurk.prototype.getReviewableHITs = function(maxPages) {
    var all = []
    var page = 1
    var processedResults = 0
    var totalNumResults = 0
    while (!maxPages || (page <= maxPages)) {
    	var XMLstring = XMLtags(
			"SortProperty", "CreationTime",
            "PageSize", "100",
            "PageNumber", "" + page	
		)
	 
        var x = new XML(javaTurKit.soapRequest("GetReviewableHITs",
            XMLstring))
        if ('' + x..Request.IsValid != "True") throw "GetReviewableHITs failed: " + x
        foreach(x..HITId, function (hitId) {
        	all.push("" + hitId)
        })
        var numResults = parseInt(x..NumResults)
        if (numResults <= 0) break
        processedResults += numResults
        totalNumResults = parseInt(x..TotalNumResults)
        if (processedResults >= totalNumResults) break
        page++
    }
    if (maxPages) {
    	all.totalNumResults = totalNumResults
    }
    return all
}

/**
 * Tries to determine the type of <code>hit</code>, and return the HIT Id.
 */
MTurk.prototype.tryToGetHITId = function(hit) {
	if ((typeof hit) == "xml") {
		return '' + hit..HITId
	} else if ((typeof hit) == "object") {
		try {
			if (hit.hitId) {
				return hit.hitId
			}
		} catch (e) {
		}
		return "" + hit
	}
	return hit
}

/**
 * Tries to determine the type of <code>assignment</code> and return the
 * assignment Id.
 */
MTurk.prototype.tryToGetAssignmentId = function(assignment) {
	if ((typeof assignment) == "xml") {
		return '' + assignment..AssignmentId
	} else if ((typeof assignment) == "object") {
		try {
			if (assignment.assignmentId) {
				return assignment.assignmentId
			}
		} catch (e) {
		}
		return "" + assignment
	}
	return assignment
}

/*
input: a string representing a date/time from MTurk
example: 2010-01-04T01:17:16Z
output: UNIX time for this time
 */
function parseMTurkTime(s) {
    var m = s.match(/(\d+)-(\d+)-(\d+)T([0-9:]+)Z/)
    return Date.parse(m[2] + "/" + m[3] + "/" + m[1] + " " + m[4] + " GMT")
}

/*
input: a HIT XML element from MTurk
output: a JS object representing the HIT
 */
MTurk.prototype.parseHIT = function(hit) {

    var xmlNull = new XML()..blah
    function g(x) {
        if (x == xmlNull) return null
        return "" + x
    }
    function gi(x) {
        if (x == xmlNull) return null
        return parseInt(x)
    }
    function gf(x) {
        if (x == xmlNull) return null
        return parseFloat(x)
    }
    function gt(x) {
        if (x == xmlNull) return null
        return parseMTurkTime(x)
    }
    
	return {
		hitId : g(hit.HITId),
		hitTypeId : g(hit.HITTypeId),
		title : g(hit.Title),
		description : g(hit.Description),
		keywords : g(hit.Keywords),
		reward : gf(hit.Reward.Amount),
		question : g(hit.Question),
		maxAssignments : parseInt(hit.MaxAssignments),
		assignmentDurationInSeconds : gi(hit.AssignmentDurationInSeconds),
        autoApprovalDelayInSeconds : gi(hit.AutoApprovalDelayInSeconds),
		requesterAnnotation : g(hit.RequesterAnnotation),
		hitStatus : g(hit.HITStatus),
		hitReviewStatus : g(hit.HITReviewStatus),
		creationTime : gt(hit.CreationTime),
		expiration : gt(hit.Expiration)
	}
}

/**
 * Returns an object representing all of the information MTurk has on the given
 * HIT, including the assigments, and the associated answer data. The returned
 * object will have a value called <i>done</i> set to true iff all the pending
 * assigments for this HIT have been completed (unless <code>getAssignments</code> is false).
 * 
 * <p>
 * Note that the <i>answer</i> data structure associated with each assigment is
 * simplified. It is recommended that you print out the result of this function
 * using {@link json}, in order to know what it looks like for your specific
 * situation.
 * </p>
 */
MTurk.prototype.getHIT = function(hit, getAssignments) {

	if (getAssignments === undefined) getAssignments = true

	var hitId = this.tryToGetHITId(hit)
	
	var XMLstring = XMLtags(
		"HITId", hitId	
	)
	var x = new XML(javaTurKit.soapRequest("GetHIT", XMLstring))
    if (x..Request.IsValid.toString() != "True") throw "GetHIT failed"
    hit = x..HIT
    
    var xmlNull = new XML()..blah
    function g(x) {
        if (x == xmlNull) return null
        return "" + x
    }
    function gi(x) {
        if (x == xmlNull) return null
        return parseInt(x)
    }
    function gf(x) {
        if (x == xmlNull) return null
        return parseFloat(x)
    }
    function gt(x) {
        if (x == xmlNull) return null
        return parseMTurkTime(x)
    }
    
    hit = this.parseHIT(hit)
    
    if (!getAssignments) return hit
    
    hit.assignments = []
    
    function processAssignment(a) {
        // NOTE: we use the singular "answer" instead of "answers"
        // to be consistent with MTurk
        var answer = {}
    
        var answers = a.Answer
        answers = answers.substring(answers.indexOf("?>\n") + 3)
        answers = new XML(answers)
        foreach(answers.*::Answer, function (a) {
            var rhs = g(a.*::FreeText)
            if (rhs == null) {
                rhs = g(a.*::UploadedFileKey)
                if (rhs != null) {
                    rhs = {
                        uploadedFileKey : rhs,
                        uploadedFileSizeInBytes : gi(a.*::UploadedFileSizeInBytes)
                    }
                }
            }
            if (rhs == null) {
                rhs = []
                foreach(a.*::SelectionIdentifier, function (sel) {
                    rhs.push("" + sel)
                })
                var o = g(a.*::OtherSelectionText)
                if (o != null) {
                    rhs.push(o)
                }
            }

            answer[g(a.*::QuestionIdentifier)] = rhs
        })
    
        hit.assignments.push({
            assignmentId : g(a.AssignmentId),
            workerId : g(a.WorkerId),
            hitId : g(a.HITId),
            assignmentStatus : g(a.AssignmentStatus),
            autoApprovalTime : gt(a.AutoApprovalTime),
            acceptTime : gt(a.AcceptTime),
            submitTime : gt(a.SubmitTime),
            answer : answer,
            requesterFeedback : g(a.RequesterFeedback),
            approvalTime : gt(a.ApprovalTime),
            deadline : gt(a.Deadline),
            rejectionTime : gt(a.RejectionTime)
        })
    }
    
    var page = 1
    var processedResults = 0
    var totalNumResults = 0
    while (true) {
        var x = new XML(javaTurKit.soapRequest("GetAssignmentsForHIT",	
        	XMLtags(		
	            "HITId", hitId,
	            "PageSize", "100",
	            "PageNumber", "" + page)
            ))
        for each (a in x..Assignment) {
            processAssignment(a)
        }
        var numResults = parseInt(x..NumResults)
        if (numResults <= 0) break
        processedResults += numResults
        totalNumResults = parseInt(x..TotalNumResults)
        if (processedResults >= totalNumResults) break
        page++
    }

	hit.done = (hit.hitStatus == "Reviewable")
			&& (hit.assignments.length == hit.maxAssignments)
	return hit
}

/**
 * Extends the <code>hit</code> by the given number of assignments (<code>moreAssignments</code>),
 * and the given number of seconds (<code>moreSeconds</code>).
 */
MTurk.prototype.extendHITRaw = function(hit, moreAssignments, moreSeconds) {
	if (javaTurKit.safety) {
		if (moreAssignments != null) {
			if ((typeof hit == "object") && ("reward" in hit)) {
			} else {
				hit = this.getHIT(hit)
			}
			this.assertWeCanSpend(parseFloat(hit.reward) * moreAssignments, 0)
		}
	}

	var hitId = this.tryToGetHITId(hit)
	var params = ["HITId", hitId]
    if (moreAssignments) {
        params.push("MaxAssignmentsIncrement")
        params.push("" + moreAssignments)
    }
    if (moreSeconds) {
        params.push("ExpirationIncrementInSeconds")
        params.push(moreSeconds)
    }
	var x = new XML(javaTurKit.soapRequest("ExtendHIT", XMLtags(params) ))
    if (x..Request.IsValid.toString() != "True") throw "GetHIT failed"
	verbosePrint("extended HIT: " + hitId)
}

/**
 * Calls {@link MTurk#extendHITRaw} inside of {@link TraceManager#once}.
 */
MTurk.prototype.extendHIT = function(hit, moreAssignments, moreSeconds) {
	return once(function() {
				return mturk.extendHITRaw(hit, moreAssignments, moreSeconds)
			})
}

/**
	Deletes the given <code>hit</code>.
	If there are any completed assignments that have not been approved or rejected, then they are approved.
 */
MTurk.prototype.deleteHITRaw = function(hit) {
	var hitId = this.tryToGetHITId(hit)
    ;(function () {
    
        // try disabling the HIT
        var x = new XML(javaTurKit.soapRequest("DisableHIT", XMLtags("HITId", hitId) ))
        if (x..Request.IsValid.toString() == "True") {
            verbosePrint("disabled HIT: " + hitId)
            return
        }
        
        // see if we already deleted the HIT
        var hit = mturk.getHIT(hitId)
        if (hit.hitStatus == "Disposed") {
            verbosePrint("already deleted HIT: " + hitId)
            return
        }
        
        // ok, it must be "Reviewable"
        // (since we couldn't disable it, and it isn't already deleted)
        
        // first, approve all the assignments
        foreach(hit.assignments, function (a) {
            if (a.assignmentStatus == "Submitted")
                mturk.approveAssignmentRaw(a)
        })
        
        // next, dispose of the HIT
        var x = new XML(javaTurKit.soapRequest("DisposeHIT", XMLtags("HITId", hitId) ))
        if (x..Request.IsValid.toString() == "True") {
            verbosePrint("disposed HIT: " + hitId)
            return
        }
        
        throw "DeleteHIT failed"
    })()
	database.query("delete __HITs[" + json(javaTurKit.mode + ":" + hitId) + "]")
}

/**
 * Calls {@link MTurk#deleteHITRaw} inside of {@link TraceManager#once}.
 */
MTurk.prototype.deleteHIT = function(hit) {
	once(function() {
				mturk.deleteHITRaw(hit)
			})
}

/**
 * Calls {@link MTurk#deleteHITRaw} on the array of <code>hits</code>.
 */
MTurk.prototype.deleteHITsRaw = function(hits) {
	if (!(hits instanceof Array)) {
		hits = [hits]
	}
	foreach(hits, function (hit) {
		mturk.deleteHITRaw(hit)
	})
}

/**
 * Calls {@link MTurk#deleteHITsRaw} inside of {@link TraceManager#once}.
 */
MTurk.prototype.deleteHITs = function(hits) {
	once(function() {
				mturk.deleteHITsRaw(hits)
			})
}

/**
 * Grants a bonus of the given <code>amount</code> to the given
 * <code>assignment</code> for the stated <code>reason</code>.
 */
MTurk.prototype.grantBonusRaw = function(assignment, amount, reason) {
	var x = new XML(javaTurKit.soapRequest("GrantBonus", XMLstringFromObjs({
        "WorkerId" : assignment.workerId,
		"AssignmentId" : assignment.assignmentId,
		"BonusAmount" : {
		    "Amount" : amount,
		    "CurrencyCode" : "USD"
		},
		"Reason" : reason
	})))
    if (x..Request.IsValid.toString() != "True") throw "GrantBonus failed: " + x
	verbosePrint("granted bonus of " + amount + " for assignment "
			+ assignment.assignmentId)
}

/**
 * Calls {@link MTurk#grantBonusRaw} inside of {@link TraceManager#once}.
 */
MTurk.prototype.grantBonus = function(assignment, amount, reason) {
	return once(function() {
				return mturk.grantBonusRaw(assignment, amount, reason)
			})
}

/**
 * Approves the given <code>assignment</code>, and provides an optional
 * <code>reason</code>.
 */
MTurk.prototype.approveAssignmentRaw = function(assignment, reason) {
	var assignmentId = this.tryToGetAssignmentId(assignment)

	var params = ["AssignmentId", assignmentId]
	if (reason) {
		params.push("RequesterFeedback")
		params.push(reason)
	}
	var x = new XML(javaTurKit.soapRequest("ApproveAssignment", XMLtags(params)))
    if (x..Request.IsValid.toString() != "True") throw "ApproveAssignment failed: " + x
	verbosePrint("approved assignment " + assignmentId)
}

/**
 * Calls {@link MTurk#approveAssignmentRaw} inside of {@link TraceManager#once}.
 */
MTurk.prototype.approveAssignment = function(assignment, reason) {
	return once(function() {
				return mturk.approveAssignmentRaw(assignment, reason)
			})
}

/**
 * Calls {@link MTurk#approveAssignment} for each assignment in the given
 * <code>assignments</code> array.
 */
MTurk.prototype.approveAssignments = function(assignments, reason) {
	foreach(assignments, function(assignment) {
				mturk.approveAssignment(assignment, reason)
			})
}

/**
 * Rejects the given <code>assignment</code>, and provides an optional
 * <code>reason</code>.
 */
MTurk.prototype.rejectAssignmentRaw = function(assignment, reason) {
	var assignmentId = this.tryToGetAssignmentId(assignment)

	var params = ["AssignmentId", assignmentId]
	if (reason) {
		params.push("RequesterFeedback")
		params.push(reason)
	}
	var x = new XML(javaTurKit.soapRequest("RejectAssignment", XMLtags(params)))
    if (x..Request.IsValid.toString() != "True") throw "RejectAssignment failed: " + x
	verbosePrint("rejected assignment " + assignmentId)
}

/**
 * Calls {@link MTurk#rejectAssignmentRaw} inside of {@link TraceManager#once}.
 */
MTurk.prototype.rejectAssignment = function(assignment, reason) {
	return once(function() {
				return mturk.rejectAssignmentRaw(assignment, reason)
			})
}

/**
 * Calls {@link MTurk#rejectAssignment} for each assignment in the given
 * <code>assignments</code> array.
 */
MTurk.prototype.rejectAssignments = function(assignments, reason) {
	foreach(assignments, function(assignment) {
				mturk.rejectAssignment(assignment, reason)
			})
}

/**
 * Returns an array of HIT data for all the HITs you currently have on MTurk.
 */
MTurk.prototype.getHITs = function(maxPages) {
    var self = this
    var all = []
    var page = 1
    var processedResults = 0
    var totalNumResults = 0
    while (!maxPages || (page <= maxPages)) {
        var x = new XML(javaTurKit.soapRequest("SearchHITs",XMLtags(
            "SortProperty", "CreationTime",
            "SortDirection", "Descending",
            "PageSize", "100",
            "PageNumber", "" + page)
        ))
        if (x..Request.IsValid.toString() != "True") throw "SearchHITs failed: " + x
        foreach(x..HIT, function (hit) {
            all.push(self.parseHIT(hit))
        })
        var numResults = parseInt(x..NumResults)
        if (numResults <= 0) break
        processedResults += numResults
        totalNumResults = parseInt(x..TotalNumResults)
        if (processedResults >= totalNumResults) break
        page++
    }
    if (maxPages) {
    	a.totalNumResults = totalNumResults
    }
    return all
}

/**
 * Returns information about the <code>hit</code> if it is done (see
 * {@link MTurk#getHIT}), and throwing the "stop" exception if it is still in
 * progress.
 */
MTurk.prototype.waitForHIT = function(hit) {
	var me = this
	var hitId = this.tryToGetHITId(hit)
	return once(function() {
		// the idea of this logic
		// is to minimize the number of calls to MTurk
		// to see if HITs are done.
		// 
		// if we are going to be calling waitForHIT a lot,
		// then we'd like to get a list of all reviewable HITs,
		// and check for the current HIT against that list,
		// and refresh that list only if enough time has passed.
		//
		// of course, if the list of reviewable HITs is very long,
		// then we'd rather not retrieve it,
		// unless we will be calling this function a lot,
		// so to figure out how many times we should wait before
		// retrieving the list,
		// we start by seeing how many pages of results that list has,
		// and if we call this function that many times,
		// then we go ahead and get the list

		if (!me.waitForHIT_callCount) {
			me.waitForHIT_callCount = 0
			var a = me.getReviewableHITs(1)
			if (a.totalNumResults == a.length) {
				me.waitForHIT_reviewableHITs = new Set(a)
				me.waitForHIT_reviewableHITsTime = time()
			}
			me.waitForHIT_waitCount = Math.ceil(a.totalNumResults / 100)
		}
		me.waitForHIT_callCount++
		if (me.waitForHIT_callCount >= me.waitForHIT_waitCount) {
			if (!me.waitForHIT_reviewableHITs ||
				(time() > me.waitForHIT_reviewableHITsTime + (1000 * 60))) {
				me.waitForHIT_reviewableHITs = new Set(me.getReviewableHITs())
				me.waitForHIT_reviewableHITsTime = time()
			}
		}
		if (me.waitForHIT_reviewableHITs) {
			if (!me.waitForHIT_reviewableHITs[hitId]) {
				stop()
			}
		}

		var hit = mturk.getHIT(hitId);
		if (!hit.done) {
			stop()
		}
		verbosePrint("hit completed: " + hitId)
		return hit
	})
}

// /////////////////////////////////////////////////////////////////////
// MTurk High-level Utilities

/**
 * Collects multiple votes until a minimum number of necessary votes for a
 * single choice is achieved. The <code>hit</code> supplied to this function
 * must have its <i>maxAssignments</i> set to the minimum number of votes
 * necessary for a single choice. This function will add assignments if
 * necessary. This function relies on <code>extractVoteFromAnswer</code> to
 * extract a String representing the choice given an answer data structure (see
 * {@link MTurk#getHIT}).
 * 
 * <p>
 * The return value is an object with the following entries:
 * </p>
 * <ul>
 * <li><b>bestOption</b>: the String representing the choice with the most
 * votes.</li>
 * <li><b>totalVoteCount</b>: the number of votes received from turkers.</li>
 * <li><b>voteCounts</b>: an object with key/value pairs representing
 * choice/voteCounts.</li>
 * <li><b>hit</b>: the HIT data structure representing the HIT on the final iteration of the voting process.</li>
 * </ul>
 */
MTurk.prototype.vote = function(hit, extractVoteFromAnswer) {
	var necessaryVoteCount = null
	var hitId = this.tryToGetHITId(hit)
	while (true) {
		var hit = this.waitForHIT(hitId)

		if (necessaryVoteCount == null) {
			necessaryVoteCount = hit.maxAssignments
		}

		var votes = {}
		foreach(hit.assignments, function(assignment) {
					var vote = extractVoteFromAnswer(assignment.answer)
					votes[vote] = ensure(votes, [vote], 0) + 1
				})
		var winnerVotes, winner
		[winnerVotes, winner] = getMax(votes)

		if (winnerVotes >= necessaryVoteCount) {
			foreach(hit.assignments, function(assignment) {
						mturk.approveAssignment(assignment)
					})
			this.deleteHIT(hit)
			return {
				bestOption : winner,
				totalVoteCount : hit.assignments.length,
				voteCounts : votes,
				hit : hit
			}
		} else {
			this.extendHIT(hit, necessaryVoteCount - winnerVotes, null)
		}
	}
}

/**
 * Works just like the JavaScript array sort function, except that this one can
 * perform comparisons in parallel on MTurk by catching the "stop" exception
 * which is thrown when waiting on an MTurk HIT using {@link MTurk#waitForHIT}.
 */
MTurk.prototype.sort = function(a, comparator) {
	traceManager.pushFrame()
	try {
		var sortTree = traceManager.getFrameValue("sortTree")
		if (!sortTree)
			sortTree = {}

		function insertIntoTree(index, tree) {
			if (tree.index == null) {
				tree.index = index
				return
			}
			var comp = comparator(a[index], a[tree.index])
			if (comp == 0) {
			} else if (comp < 0) {
				insertIntoTree(index, ensure(tree, ["left"], {}))
			} else {
				insertIntoTree(index, ensure(tree, ["right"], {}))
			}
		}
		var done = true
		foreach(a, function(e, i) {
					if (attempt(function() {
								insertIntoTree(i, sortTree)
							})) {
						traceManager.setFrameValue("sortTree", sortTree)
					} else {
						done = false
					}
				})
		if (!done)
			stop()

		var newA = []
		function traverseTree(tree) {
			if (!tree)
				return
			traverseTree(tree.left)
			newA.push(a[tree.index])
			traverseTree(tree.right)
		}
		traverseTree(sortTree)
		return newA
	} finally {
		traceManager.popFrame()
	}
}

/**
 * A reference to an {@link MTurk} object.
 * 
 * @return {MTurk}
 */
mturk = new MTurk()
