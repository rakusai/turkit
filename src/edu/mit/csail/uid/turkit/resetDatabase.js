
foreach(database.query("return keys(ensure('__HITs'))"), function (hit) {
	var m = hit.match(/^(real|sandbox):(.*)$/)
	if (m) { 
		setMode(m[1])
		mturk.deleteHITRaw(m[2])
	} else {
		mturk.deleteHITRaw(hit)
	}
})

foreach(database.query("return keys(ensure('__S3_Objects'))"), function (obj) {
    s3.deleteObjectRaw(obj)
})
