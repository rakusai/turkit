package edu.mit.csail.uid.turkit;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import edu.mit.csail.uid.turkit.util.Base64;
import edu.mit.csail.uid.turkit.util.MyMap;
import edu.mit.csail.uid.turkit.util.U;

public class S3 {

	private static final String HMAC_SHA1_ALGORITHM = "HmacSHA1";

	/**
	 * A date formatter for dates in our HTTP requests.
	 */
	public static final SimpleDateFormat dateFormat = new SimpleDateFormat(
			"EEE, d MMM yyyy HH:mm:ss Z");

	static {
		dateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
	}

	/**
	 * Gets the current time formatted with our date formatter.
	 */
	public static String getDate() {
		return dateFormat.format(new Date());
	}

	/**
	 * Computes a Signature for use in S3 REST requests.
	 */
	public static String sign(String key, String httpVerb, String bucket,
			String file, Map<String, List<String>> params) throws Exception {
		// see:
		// http://docs.amazonwebservices.com/AmazonS3/latest/index.html?RESTAuthentication.html

		httpVerb = httpVerb.toUpperCase();

		String date = params.containsKey("Date") ? params.get("Date").get(0)
				: "";

		String contentMd5 = params.containsKey("Content-MD5") ? params.get(
				"Content-MD5").get(0) : "";

		String contentType = params.containsKey("Content-Type") ? params.get(
				"Content-Type").get(0) : "";

		String canonicalizedAmzHeaders;
		{
			ArrayList<String> a = new ArrayList();
			for (Map.Entry<String, List<String>> e : params.entrySet()) {
				String name = e.getKey().toLowerCase();
				if (name.startsWith("x-amz-")) {
					ArrayList<String> tmp = new ArrayList(e.getValue());
					for (int i = 0; i < tmp.size(); i++) {
						tmp.set(i, tmp.get(i).replaceAll("\\s+", " "));
					}
					Collections.sort(tmp);
					a.add(name + ":" + U.join(tmp, ",") + "\n");
				}
			}
			Collections.sort(a);
			canonicalizedAmzHeaders = U.join(a, "");
		}

		String canonicalizedResource;
		{
			canonicalizedResource = (bucket != null ? "/" + bucket : "/")
					+ (file != null ? "/" + file : "");
		}

		String stringToSign = httpVerb + "\n" + contentMd5 + "\n" + contentType
				+ "\n" + date + "\n" + canonicalizedAmzHeaders
				+ canonicalizedResource;

		Mac mac = Mac.getInstance(HMAC_SHA1_ALGORITHM);
		mac.init(new SecretKeySpec(key.getBytes("UTF8"), HMAC_SHA1_ALGORITHM));
		return Base64.encodeBytes(mac.doFinal(stringToSign.getBytes("UTF8")));
	}

	/**
	 * Performs a REST request on S3. The <code>paramsList</code> must be a
	 * sequence of strings of the form a1, b1, a2, b2, a3, b3 ... Where aN is a
	 * parameter name, and bN is the value for that parameter.
	 */
	public static String restRequest(String id, String secretKey,
			String httpVerb, String bucket, String file, byte[] data,
			String... paramsList) throws Exception {

		Map<String, List<String>> params = new MyMap(ArrayList.class);

		String now = dateFormat.format(new Date());
		params.get("Date").add(now);

		if (data != null) {
			if (file != null && U.match("(\\.[^\\.]+)$", file)) {
				String mimeType = getMimeType(U.m.group(1));
				if (mimeType != null) {
					params.get("Content-Type").add(mimeType);
				}
			}
			params.get("Content-Length").add("" + data.length);
			params.get("Content-MD5").add("" + U.md5_base64(data));
		}

		for (int i = 0; i < paramsList.length; i += 2) {
			params.get(paramsList[i]).add(paramsList[i + 1]);
		}

		URL url = new URL("http://s3.amazonaws.com"
				+ ((bucket != null) && (bucket.length() > 0) ? "/" + bucket
						: "")
				+ ((file != null) && (file.length() > 0) ? "/" + file : ""));

		if (!params.containsKey("Authorization")) {
			params.get("Authorization").add(
					"AWS " + id + ":"
							+ sign(secretKey, httpVerb, bucket, file, params));
		}

		for (int t = 0; t < 100; t++) {
			HttpURLConnection con = (HttpURLConnection) url.openConnection();
			con.setRequestMethod(httpVerb);

			for (Map.Entry<String, List<String>> e : params.entrySet()) {
				con.setRequestProperty(e.getKey(), U.join(e.getValue(), ","));
			}

			if (data != null) {
				con.setDoOutput(true);
			}

			con.connect();

			OutputStream out = null;
			if (data != null) {
				out = con.getOutputStream();
				out.write(data);
				out.flush();
			}

			int resp = con.getResponseCode();
			if (resp == 503) {
				Thread.sleep(100 + (int) Math.min(3000, Math.pow(t, 3)));
				continue;
			}

			if (resp / 100 != 2) {
				String err = U.slurp(con.getErrorStream(), "UTF8");
				throw new Exception("S3 call failed: " + resp + ", error message: " + err);
			}

			String s = U.slurp(con.getInputStream(), "UTF8");

			if (data != null) {
				out.close();
			}

			if (s.startsWith("<?")) {
				return s.substring(s.indexOf("?>\n") + 3);
			} else {
				return s;
			}
		}
		throw new Exception("S3 seems to be down.");

	}

	public static String getBuckets(String id, String secretKey)
			throws Exception {

		return restRequest(id, secretKey, "GET", null, null, null);
	}

	public static String putBucket(String id, String secretKey, String bucket)
			throws Exception {

		return restRequest(id, secretKey, "PUT", bucket, null, null,
				"Content-Length", "0");
	}

	public static String getObjects(String id, String secretKey, String bucket)
			throws Exception {

		return restRequest(id, secretKey, "GET", bucket, null, null);
	}

	public static String putObject(String id, String secretKey, String bucket,
			String file, byte[] data) throws Exception {
		try {
			return S3.restRequest(id, secretKey, "PUT", bucket, file, data,
					"x-amz-acl", "public-read");
		} catch (Exception e) {
			putBucket(id, secretKey, bucket);
			return S3.restRequest(id, secretKey, "PUT", bucket, file, data,
					"x-amz-acl", "public-read");
		}
	}

	public static String putObject(String id, String secretKey, String bucket,
			String file, String data) throws Exception {
		ByteArrayOutputStream buf = new ByteArrayOutputStream();
		PrintWriter out = new PrintWriter(new OutputStreamWriter(buf, "UTF8"));
		out.print(data);
		out.close();
		return putObject(id, secretKey, bucket, file, buf.toByteArray());
	}

	public static String putObject(String id, String secretKey, String bucket,
			String file, File data) throws Exception {

		return putObject(id, secretKey, bucket, file, U.slurpBytes(data));
	}

	public static String deleteObject(String id, String secretKey,
			String bucket, String file) throws Exception {
		return S3.restRequest(id, secretKey, "DELETE", bucket, file, null);
	}

	public static Map<String, String> mimeTypes;

	public static String getMimeType(String extention) throws Exception {
		if (mimeTypes == null) {
			mimeTypes = new HashMap();
			String s = U.slurp(S3.class.getResource("mimeTypes.txt"));
			Matcher m = Pattern.compile("(?msi)^(\\S+)\\s+(\\S+)$").matcher(s);
			while (m.find()) {
				mimeTypes.put(m.group(1), m.group(2));
			}
		}
		return mimeTypes.get(extention);
	}
}
