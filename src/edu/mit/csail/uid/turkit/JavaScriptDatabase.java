package edu.mit.csail.uid.turkit;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;

import edu.mit.csail.uid.turkit.util.U;

public class JavaScriptDatabase {
	/**
	 * The file used to store all the data.
	 * This data takes the form of JavaScript which can be evaluated to re-create the state of the JavaScript environment in the database.
	 */
	public File storageFile;
	private File tempFile;
	private Context cx;
	private Scriptable scope;
	private PrintWriter storageFileOut;
	private ConsolidationTimer consolidationTimer;
	private boolean needsConsolidation = true;

	/**
	 * Creates a JavaScript Database using the given <code>storageFile</code>.
	 * The <code>tempFile</code> is used as a swap file, and may, under obscure certain conditions,
	 * be the only living version of the data.
	 * If this happens, the data will be loaded from the <code>tempFile</code> the next time this constructor is called.
	 * @param storageFile
	 * @param tempFile
	 * @throws Exception
	 */
	public JavaScriptDatabase(File storageFile, File tempFile) throws Exception {
		this.storageFile = storageFile;
		this.tempFile = tempFile;

		cx = Context.enter();
		cx.setLanguageVersion(170);
		scope = cx.initStandardObjects();

		RhinoUtil.evaluateURL(cx, scope, this.getClass().getResource(
				"js_libs/util.js"));

		if (!storageFile.exists() && tempFile.exists()) {
			tempFile.renameTo(storageFile);
		}
		if (storageFile.exists()) {
			// check for any errors in the file
			String s = U.slurp(storageFile);
			String rest = s;
			int goodUntil = 0;
			int entryCount = 0;
			while (true) {
				Matcher m = Pattern.compile("^// begin:(\\w+)\r?\n").matcher(
						rest);
				if (m.find()) {
					String key = m.group(1);
					m = Pattern.compile("(?m)^// end:" + key + "\r?\n")
							.matcher(rest);
					if (m.find()) {
						entryCount++;
						goodUntil += m.end();
						rest = rest.substring(m.end());
					} else {
						break;
					}
				} else {
					break;
				}
			}

			s = s.substring(0, goodUntil);
			RhinoUtil.evaluateString(cx, scope, s, storageFile
					.getAbsolutePath());

			// save a copy of the storage file if it is corrupt
			if (goodUntil < s.length()) {
				U.copyFile(storageFile, new File(storageFile.getAbsolutePath()
						+ ".corrupt."
						+ U.getRandomString(10, "01234567890abcdef")));
			}

			if ((entryCount > 1) || (goodUntil < s.length())) {
				consolidate();
			} else {
				needsConsolidation = false;
			}
		}
		consolidationTimer = new ConsolidationTimer();
	}

	/**
	 * Releases resources associated with the JavaScript Database.
	 * In particular, it releases a thread--failure to call <code>close</code>
	 * may result in your program continuing to run after your main method has ended.
	 */
	synchronized public void close() {
		consolidationTimer.close();
		if (storageFileOut != null) {
			storageFileOut.close();
			storageFileOut = null;
		}
	}

	/**
	 * Deletes the files associated with the JavaScript database.
	 * @param saveBackup set to true if you want to keep a backup copy of the database file
	 */
	synchronized public void delete(boolean saveBackup) throws Exception {
		if (saveBackup) {
			consolidate();
		}
		close();
		if (saveBackup) {
			int i = 1;
			while (true) {
				File dest = new File(storageFile.getAbsolutePath() + ".old" + i);
				if (!dest.exists()) {
					storageFile.renameTo(dest);
					break;
				}
				i++;
			}
		} else {
			storageFile.delete();
		}
		tempFile.delete();
	}

	private class ConsolidationTimer implements Runnable {
		public long movingSaveTime = 0;
		public long staticSaveTime = 0;
		public long staticSaveTime_delta = 60 * 1000;
		public long movingSaveTime_delta = 10 * 1000;
		public Thread thread;

		public ConsolidationTimer() {
		}

		public void onQuery() {
			synchronized (JavaScriptDatabase.this) {
				if ((thread != null) && !thread.isInterrupted()) {
					long time = System.currentTimeMillis();
					movingSaveTime = time + movingSaveTime_delta;
				} else {
					long time = System.currentTimeMillis();
					staticSaveTime = time + staticSaveTime_delta;
					movingSaveTime = time + movingSaveTime_delta;
					thread = new Thread(this);
					thread.start();
				}
			}
		}

		public void onConsolidate() {
			synchronized (JavaScriptDatabase.this) {
				close();
			}
		}

		public void close() {
			synchronized (JavaScriptDatabase.this) {
				if (thread != null) {
					thread.interrupt();
				}
			}
		}

		public void run() {
			try {
				while (true) {
					synchronized (JavaScriptDatabase.this) {
						if (Thread.interrupted()) {
							break;
						}

						long currentTime = System.currentTimeMillis();
						long nearestSaveTime = Math.min(movingSaveTime,
								staticSaveTime);
						if (currentTime >= nearestSaveTime) {
							consolidate();
							thread = null;
							break;
						} else {
							JavaScriptDatabase.this.wait(nearestSaveTime - currentTime);
						}
					}
				}
			} catch (InterruptedException e) {
			} catch (Exception e) {
				U.rethrow(e);
			}
			thread = null;
		}
	}

	private String getKey(String s) {
		String key = null;
		for (int length = 4;; length++) {
			key = U.getRandomString(length, "0123456789abcdef");
			if (s.indexOf(key) < 0) {
				break;
			}
		}
		return key;
	}

	/**
	 * Reformat the representation of the JavaScript database on disk to take up less space.
	 * @throws Exception
	 */
	synchronized public void consolidate() throws Exception {
		if (!needsConsolidation) {
			return;
		}
		needsConsolidation = false;

		if (storageFileOut != null) {
			storageFileOut.close();
			storageFileOut = null;
		}

		String s = RhinoUtil.json_scope(scope);
		String key = getKey(s);
		U.saveString(tempFile, "// begin:" + key + "\n" + s + "// end:" + key
				+ "\n");
		if (storageFile.exists()) {
			if (!storageFile.delete()) {
				throw new Exception(
						"failed to delete file, is some other program using the file: "
								+ storageFile.getAbsolutePath() + "?");
			}
		}
		tempFile.renameTo(storageFile);

		if (consolidationTimer != null)
			consolidationTimer.onConsolidate();
	}

	/**
	 * Evaluates <code>q</code> as-is in the context of the JavaScript database, and returns the resulting Rhino object.
	 */
	synchronized public Object queryRaw(String q) throws Exception {
		return RhinoUtil.evaluateString(cx, scope, q, "query");
	}

	/**
	 * Evaluates <code>q</code> in the context of the JavaScript database.
	 * State changes are persisted on disk,
	 * and the result is returned to the user using {@link RhinoJson#json(Object)}.
	 * 
	 * <p>NOTE: Queries are wrapped inside a function body, so a query of the form<br>
	 * <code>var a = 5; return a</code><br>
	 * becomes...<br>
	 * <code>(function(){var a = 5; return a})()</code></p>
	 * @param q
	 * @return
	 * @throws Exception
	 */
	synchronized public String query(String q) throws Exception {
		q = "try{(function(){\n" + q + "\n})()}catch(e){e}\n";
		Object ret = RhinoUtil.evaluateString(cx, scope, q, "query");

		String key = getKey(q);
		if (storageFileOut == null) {
			storageFileOut = new PrintWriter(new FileOutputStream(storageFile,
					true));
		}
		storageFileOut.print("// begin:" + key + "\n" + q + "// end:" + key
				+ "\n");
		storageFileOut.flush();
		needsConsolidation = true;

		if (consolidationTimer != null)
			consolidationTimer.onQuery();

		return RhinoUtil.json(ret);
	}
}
