package edu.mit.csail.uid.turkit;

import java.io.IOException;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.TimeZone;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import edu.mit.csail.uid.turkit.util.Base64;
import edu.mit.csail.uid.turkit.util.U;

public class MTurk {

	private static final String HMAC_SHA1_ALGORITHM = "HmacSHA1";

	/*
	 * A date formatter for XML DateTimes.
	 */
	public static final SimpleDateFormat xmlTimeFormat = new SimpleDateFormat(
			"yyyy-MM-dd'T'HH:mm:ss'Z'");

	static {
		xmlTimeFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
	}

	/**
	 * Gets the current time as an XML DateTime string.
	 */
	public static String getTimestamp() {
		return xmlTimeFormat.format(new Date());
	}

	/**
	 * Computes a Signature for use in MTurk REST requests.
	 */
	public static String getSignature(String service, String operation,
			String timestamp, String secretKey) throws Exception {

		Mac mac = Mac.getInstance(HMAC_SHA1_ALGORITHM);
		mac.init(new SecretKeySpec(secretKey.getBytes(), HMAC_SHA1_ALGORITHM));
		return Base64.encodeBytes(mac.doFinal((service + operation + timestamp)
				.getBytes()));
	}

	/**
	 * Performs a REST request on MTurk. The <code>paramsList</code> must be a
	 * sequence of strings of the form a1, b1, a2, b2, a3, b3 ... Where aN is a
	 * parameter name, and bN is the value for that parameter. Most common
	 * parameters have suitable default values, namely: Version, Timestamp,
	 * Query, and Signature.
	 */
	public static String restRequest(String id, String secretKey,
			boolean sandbox, String operation, String... paramsList)
			throws Exception {

		Map<String, String> params = new HashMap();
		params.put("Service", "AWSMechanicalTurkRequester");
		params.put("AWSAccessKeyId", id);
		params.put("Operation", operation);
		params.put("Version", "2008-08-02");
		params.put("Timestamp", getTimestamp());

		for (int i = 0; i < paramsList.length; i += 2) {
			params.put(paramsList[i], paramsList[i + 1]);
		}

		if (!params.containsKey("Signature")) {
			params.put("Signature", getSignature(params.get("Service"), params
					.get("Operation"), params.get("Timestamp"), secretKey));
		}

		String url = sandbox ? "http://mechanicalturk.sandbox.amazonaws.com/?"
				: "http://mechanicalturk.amazonaws.com/?";
		boolean first = true;
		for (Map.Entry<String, String> e : params.entrySet()) {
			if (e.getValue() == null)
				continue;
			if (!first) {
				url += "&";
			} else {
				first = false;
			}
			url += U.escapeURL(e.getKey()) + "=" + U.escapeURL(e.getValue());
		}

		for (int t = 0; t < 100; t++) {
			try {
				String s = U.slurp(new URL(url));
				return s.substring(s.indexOf("?>\n") + 3);
			} catch (IOException e) {
				if (e.getMessage().startsWith(
						"Server returned HTTP response code: 503")) {
					Thread.sleep(100 + (int) Math.min(3000, Math.pow(t, 3)));
				} else {
					throw e;
				}
			}
		}
		throw new Exception("MTurk seems to be down.");
	}
}
