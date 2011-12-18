
(function () {
	var a = input.match(/^\w+\s+=[ \t]*$/m)
	if (a) {
		throw "You need a value on line:\n\n" + a[0]
	}
	
	input = input.replace(/(=[ \t]+)([^\r\n]+)/g, function(s, a, b) {
				if (b.match(/^"|^[0-9.]+$|^true$|^false$/)) {
					return s
				} else {
					return a + json(b)
				}
			})
	
	eval(input)
})()
