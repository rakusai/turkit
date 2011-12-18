
(function () {
	function bagGet(bag, key) {
	    if (bag[key] == null) {
	        return 0
	    }
	    return bag[key]
	}
	function bagAdd(bag, key, amount) {
	    if (!amount) amount = 1
        bag[key] = bagGet(bag, key) + amount
	    return bag
	}
	
	var hitBag = {}
	foreach(ensure("__HITs", {}), function (hit, hitId) {
		var m = hitId.match(/^(real|sandbox):(.*)$/)
		if (m) { 
			hitId = m[2]
		}
		bagAdd(hitBag, hit.url)
	})

	var v = []
	
	v.push('<p>HITs:<br>')
	if (keys(hitBag).length > 0) {
		v.push('<table border="0">')
		foreach(hitBag, function (count, url) {
			v.push('<tr><td>' + count + '&nbsp;&nbsp;&nbsp;&nbsp;</td><td><a href="' + escapeXml(url) + '">' + escapeXml(url) + '</a></td></tr>')
		})
		v.push('</table>')
	} else {
		v.push('<i>none</i>')
	}
	v.push('</p>')
	
	v.push('<p>S3 Objects:<br>')
	if (keys(ensure("__S3_Objects")).length > 0) {
		v.push('<table border="0">')
		foreach(ensure("__S3_Objects"), function (e, url) {
			v.push('<tr><td><a href="' + escapeXml(url) + '">' + escapeXml(url) + '</a></td></tr>')
		})
		v.push('</table>')
	} else {
		v.push('<i>none</i>')
	}
	v.push('</p>')
	
	return v.join('')
})()
