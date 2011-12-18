package edu.mit.csail.uid.turkit.gui;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import javax.swing.JOptionPane;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.Scriptable;

import edu.mit.csail.uid.turkit.RhinoUtil;
import edu.mit.csail.uid.turkit.util.U;

public class PropertiesReader {
	public static Map<String, Object> read(String input, boolean showMessages)
			throws Exception {
		Map<String, Object> map = new HashMap();

		Context cx = Context.enter();
		cx.setLanguageVersion(170);
		Scriptable scope = cx.initStandardObjects();

		RhinoUtil.evaluateURL(cx, scope, PropertiesReader.class
				.getResource("/edu/mit/csail/uid/turkit/js_libs/util.js"));
		scope.put("input", scope, input);

		Set<String> old = new HashSet();
		for (Object o : scope.getIds()) {
			old.add(o.toString());
		}
		try {
			RhinoUtil.evaluateURL(cx, scope, PropertiesReader.class
					.getResource("propertiesReader.js"));
		} catch (Exception e) {
			if (e instanceof JavaScriptException) {
				JavaScriptException je = (JavaScriptException) e;
				if (showMessages) {
					JOptionPane.showMessageDialog(null, je.details());
				}
				return null;
			} else {
				throw e;
			}
		}
		for (Object o : scope.getIds()) {
			String key = o.toString();
			if (!old.contains(key)) {
				map.put(key, scope.get(key, null));
			}
		}
		return map;
	}
}
