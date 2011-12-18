package edu.mit.csail.uid.turkit;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.HashMap;
import java.util.Map;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.EvaluatorException;
import org.mozilla.javascript.NativeArray;
import org.mozilla.javascript.NativeJavaObject;
import org.mozilla.javascript.NativeObject;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.Undefined;
import org.mozilla.javascript.WrappedException;

import edu.mit.csail.uid.turkit.util.U;

public class RhinoUtil {
	private static Map<Object, String> objToPath;
	private static StringBuffer result;
	private static StringBuffer appendAtEnd;

	interface Func {
		public Object func() throws Exception;
	}

	private static Object evaluate(Context cx, Func f) throws Exception {
		try {
			return f.func();
		} catch (Throwable t) {
			boolean retry = false;

			if (!retry) {
				if ((t instanceof EvaluatorException)
						&& !(t instanceof WrappedException)) {
					retry = true;
				}
			}

			if (!retry) {
				if ((t instanceof IllegalArgumentException)
						&& (t.getMessage().equals("out of range index"))) {
					retry = true;
				}
			}

			if (false && !retry) {

				// it would be nice to have some generic way of knowing
				// if the error was caused by the limitations of the optimizer

				ByteArrayOutputStream out = new ByteArrayOutputStream();
				PrintStream ps = new PrintStream(out);
				t.printStackTrace(ps);
				ps.close();
				if (out.toString().contains("org.mozilla.javascript.optimizer")) {
					retry = true;
				}
			}

			if (retry) {
				System.out.println("Retrying Script Evaluation: "
						+ t.getMessage());

				int oldOp = cx.getOptimizationLevel();
				cx.setOptimizationLevel(-1);
				Object ret = f.func();
				cx.setOptimizationLevel(oldOp);
				return ret;
			} else {
				if (t instanceof Exception)
					throw (Exception) t;
				U.rethrow(t);
				return null;
			}
		}
	}

	/**
	 * Wrapper around <code>Context.evaluateString</code> which tries to
	 * evaluate the code first with optimization turned on, and if that doesn't
	 * work, tries executing it again with optimization turned off. This is
	 * convenient when the script may be too large (~200kb) to execute with
	 * optimization turned on.
	 */
	public static Object evaluateString(final Context cx,
			final Scriptable scope, final String source, final String sourceName)
			throws Exception {
		return evaluate(cx, new Func() {
			public Object func() {
				return cx.evaluateString(scope, source, sourceName, 1, null);
			}
		});
	}

	/**
	 * Wrapper around <code>Context.evaluateReader</code> which tries to
	 * evaluate the code first with optimization turned on, and if that doesn't
	 * work, tries executing it again with optimization turned off. This is
	 * convenient when the script may be too large (~200kb) to execute with
	 * optimization turned on.
	 */
	public static Object evaluateFile(final Context cx, final Scriptable scope,
			final File file) throws Exception {
		return evaluate(cx, new Func() {
			public Object func() throws Exception {
				return cx.evaluateReader(scope, new InputStreamReader(
						new FileInputStream(file), Charset.forName("UTF-8")),
						file.getAbsolutePath(), 1, null);
			}
		});
	}

	/**
	 * Wrapper around <code>Context.evaluateReader</code> which tries to
	 * evaluate the code first with optimization turned on, and if that doesn't
	 * work, tries executing it again with optimization turned off. This is
	 * convenient when the script may be too large (~200kb) to execute with
	 * optimization turned on.
	 */
	public static Object evaluateURL(final Context cx, final Scriptable scope,
			final URL url) throws Exception {
		return evaluate(cx, new Func() {
			public Object func() throws Exception {
				return cx.evaluateReader(scope, new InputStreamReader(url
						.openStream(), Charset.forName("UTF-8")), url
						.toString(), 1, null);
			}
		});
	}

	/**
	 * Return a string of JavaScript which, when evaluated, recreates all the
	 * variables and data structures in <code>scope</code>.
	 * 
	 * @param scope
	 * @return
	 */
	public static String json_scope(Scriptable scope) {
		objToPath = new HashMap();
		result = new StringBuffer();
		appendAtEnd = new StringBuffer();

		for (Object id : scope.getIds()) {
			Object o = scope.get(id.toString(), null);
			if (!json_helper_supported_type(o))
				continue;

			result.append(id + " = ");
			json_helper(scope.get(id.toString(), null), "", id.toString(), "");
			result.append("\n");
		}
		result.append(appendAtEnd);
		return result.toString();
	}

	/**
	 * Returns a string of JavaScript which, when evaluated, recreates the data
	 * value or data structure <code>o</code>. Note that works even if
	 * <code>o</code> contains circular references. This method does not handle
	 * functions.
	 * 
	 * <p>
	 * NOTE: The result does not conform to standard JSON. It is very close when
	 * <code>o</code> is a non-recursive data structure, except that parentheses
	 * are included at the beginning and end so that the string can be
	 * evaluated.
	 * </p>
	 * 
	 * @param o
	 * @return
	 */
	public static String json(Object o) {
		objToPath = new HashMap();
		result = new StringBuffer();
		appendAtEnd = new StringBuffer();

		json_helper(o, "", "data", "\t");

		if (appendAtEnd.length() > 0) {
			result.insert(0, "(function () {\n\tvar data = ");
			result.append("\n");
			result.append(appendAtEnd);
			result.append("\treturn data\n})()");
		} else if (objToPath.size() != 0) {
			result.insert(0, "(");
			result.append(")");
		}
		return result.toString();
	}

	private static boolean json_helper_supported_type(Object o) {
		if (o == null) {
		} else if (o instanceof NativeJavaObject) {
		} else if (o instanceof NativeObject || o instanceof NativeArray) {
		} else if (o instanceof String) {
		} else if (o instanceof Double) {
		} else if (o instanceof Integer) {
		} else if (o instanceof Long) {
		} else if (o instanceof Boolean) {
		} else if (o instanceof Undefined) {
		} else {
			return false;
		}
		return true;
	}

	private static void json_helper(Object o, String indent, String path,
			String appendIndent) {
		if (o == null) {
			result.append("null");
		} else if (o instanceof NativeJavaObject) {
			NativeJavaObject a = (NativeJavaObject) o;
			result.append("\"");
			U.escapeString(result, a.getDefaultValue(null).toString());
			result.append("\"");
		} else if (o instanceof NativeObject || o instanceof NativeArray) {
			String prevPath = objToPath.get(o);
			if (prevPath != null) {
				result.append("/* ");
				result.append(prevPath);
				result.append(" */0");
				appendAtEnd.append(appendIndent + path + " = " + prevPath
						+ "\n");
			} else {
				objToPath.put(o, path);
				if (o instanceof NativeArray) {
					NativeArray a = (NativeArray) o;
					result.append("[\n");
					String indentMore = indent + "\t";
					for (int i = 0; i < a.getLength(); i++) {
						result.append(indentMore);
						json_helper(a.get(i, null), indentMore, path + "[" + i
								+ "]", appendIndent);
						if (i + 1 < a.getLength()) {
							result.append(",\n");
						} else {
							result.append("\n");
						}
					}
					result.append(indent);
					result.append("]");
				} else {
					NativeObject n = (NativeObject) o;
					result.append("{\n");
					String indentMore = indent + "\t";
					boolean first = true;
					for (Object k : n.getAllIds()) {
						if (first) {
							first = false;
						} else {
							result.append(",\n");
						}
						result.append(indentMore);
						result.append("\"");
						String escapedK = U.escapeString(k.toString());
						result.append(escapedK);
						result.append("\" : ");
						json_helper(objGet(n, k), indentMore, path + "[\""
								+ escapedK + "\"]", appendIndent);
					}
					if (!first) {
						result.append("\n");
					}
					result.append(indent);
					result.append("}");
				}
			}
		} else if (o instanceof String) {
			result.append('"');
			U.escapeString(result, o.toString());
			result.append('"');
		} else if (o instanceof Double) {
			Double d = (Double) o;
			if (d.isInfinite() || d.isNaN()) {
				if (d.isInfinite())
					result.append("null /* infinite */");
				else if (d.isNaN())
					result.append("null /* NaN */");
				// throw new Error("bad double: " + d);
			} else {
				String a = o.toString();
				if (a.endsWith(".0")) {
					result.append(a.subSequence(0, a.length() - 2));
				} else {
					result.append(a);
				}
			}
		} else if (o instanceof Integer) {
			result.append(o.toString());
		} else if (o instanceof Long) {
			result.append(o.toString());
		} else if (o instanceof Boolean) {
			result.append(o.toString());
		} else if (o instanceof Undefined) {
			result.append("undefined");
		} else {
			String error = "error: type not supported: " + o + ": "
					+ o.getClass();
			result.append("null /* " + error + " */");
			if (false) {
				throw new Error(error);
			}
		}
	}

	private static Object objGet(NativeObject o, Object id) {
		if (id instanceof String) {
			return o.get((String) id, null);
		} else {
			return o.get((Integer) id, null);
		}
	}
}
