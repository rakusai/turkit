package edu.mit.csail.uid.turkit.gui;

import java.awt.BorderLayout;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.KeyEvent;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.awt.event.WindowFocusListener;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.PrintStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Vector;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import javax.swing.AbstractAction;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JComponent;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JMenu;
import javax.swing.JMenuBar;
import javax.swing.JMenuItem;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JSplitPane;
import javax.swing.KeyStroke;
import javax.swing.SwingUtilities;
import javax.swing.Timer;
import javax.swing.WindowConstants;
import javax.swing.filechooser.FileFilter;

import com.javadocking.DockingManager;
import com.javadocking.dock.Position;
import com.javadocking.dock.SplitDock;
import com.javadocking.dock.TabDock;
import com.javadocking.dockable.DefaultDockable;
import com.javadocking.dockable.Dockable;
import com.javadocking.dockable.DockingMode;
import com.javadocking.model.FloatDockModel;

import edu.mit.csail.uid.turkit.JavaScriptDatabase;
import edu.mit.csail.uid.turkit.TurKit;
import edu.mit.csail.uid.turkit.util.U;

public class Main implements SimpleEventListener {
	public static JavaScriptDatabase turkitProperties;
	public SimpleEventManager sem;
	public File jsFile;
	public File propertiesFile;
	public JFrame f;
	public TurKit turkit;
	public RunControls runControls;
	public OutputPane outputPane;
	public DatabasePane databasePane;
	public CodePane codePane;
	public PropertiesPane propertiesPane;
	public HITsAndS3Pane hitsAndS3Pane;
	public long runAgainAtThisTime;
	public Timer timer;
	public Dockable propertiesDock;
	public Dockable codeDock;
	public TabDock leftTabDock;
	public JComboBox modeDropdown;

	public static void main(String[] args) throws Exception {
		if (args.length > 0) {
			CommandLineInterface cli = new CommandLineInterface();
			cli.run(args);
		} else {
			SwingUtilities.invokeLater(new Runnable() {
				public void run() {
					try {
						new Main();
					} catch (Exception e) {
						U.rethrow(e);
					}
				}
			});
		}
	}

	public Main() throws Exception {
		if (turkitProperties == null) {
			turkitProperties = new JavaScriptDatabase(new File(
					"turkit.properties"), new File("turkit.properties.tmp"));
		}

		// create gui
		f = new JFrame();
		U.exitOnClose(f);
		f.setTitle("TurKit");
		f.getContentPane().setLayout(new BorderLayout());

		// actions
		sem = new SimpleEventManager();
		sem.addListener(this);
		{
			JComponent r = f.getRootPane();

			r.getActionMap().put("new", new AbstractAction() {
				public void actionPerformed(ActionEvent e) {
					sem.fireEvent("new", null, null);
				}
			});
			r.getActionMap().put("open", new AbstractAction() {
				public void actionPerformed(ActionEvent e) {
					sem.fireEvent("open", null, null);
				}
			});
			r.getActionMap().put("save", new AbstractAction() {
				public void actionPerformed(ActionEvent e) {
					sem.fireEvent("save", null, null);
				}
			});
			r.getActionMap().put("stop", new AbstractAction() {
				public void actionPerformed(ActionEvent e) {
					sem.fireEvent("stop", null, null);
				}
			});
			r.getActionMap().put("run", new AbstractAction() {
				public void actionPerformed(ActionEvent e) {
					sem.fireEvent("run", null, null);
				}
			});
			r.getActionMap().put("run-repeat", new AbstractAction() {
				public void actionPerformed(ActionEvent e) {
					sem.fireEvent("run", true, null);
				}
			});
		}

		// menubar
		{
			JMenuBar menubar = new JMenuBar();
			f.setJMenuBar(menubar);
			{
				JMenu m = new JMenu("File");
				menubar.add(m);
				{
					JMenuItem mi = new JMenuItem("New", 'N');
					mi.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_N,
							ActionEvent.CTRL_MASK));
					m.add(mi);
					mi.addActionListener(f.getRootPane().getActionMap().get(
							"new"));
				}
				{
					JMenuItem mi = new JMenuItem("Open", 'O');
					mi.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_O,
							ActionEvent.CTRL_MASK));
					m.add(mi);
					mi.addActionListener(f.getRootPane().getActionMap().get(
							"open"));
				}
				{
					JMenuItem mi = new JMenuItem("Save", 'S');
					mi.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_S,
							ActionEvent.CTRL_MASK));
					m.add(mi);
					mi.addActionListener(f.getRootPane().getActionMap().get(
							"save"));
					mi.getInputMap(mi.WHEN_IN_FOCUSED_WINDOW).put(
							KeyStroke.getKeyStroke(KeyEvent.VK_S,
									ActionEvent.CTRL_MASK), "save");
				}
			}
			{
				JMenu m = new JMenu("Tools");
				menubar.add(m);
				{
					JMenuItem mi = new JMenuItem("Delete all sandbox HITs");
					m.add(mi);

					mi.addActionListener(new ActionListener() {
						public void actionPerformed(ActionEvent e) {
							try {
								if (JOptionPane
										.showConfirmDialog(
												f,
												"Pressing 'Ok' will result in deleting all of your HITs from the sandbox.",
												"Delete all sandbox HITs?",
												JOptionPane.OK_CANCEL_OPTION) == JOptionPane.OK_OPTION) {
									onDeleteAllHITs("sandbox");
								}
							} catch (Exception ee) {
								U.rethrow(ee);
							}
						}
					});
				}
				{
					JMenuItem mi = new JMenuItem("Delete all real HITs");
					m.add(mi);

					mi.addActionListener(new ActionListener() {
						public void actionPerformed(ActionEvent e) {
							try {
								if (JOptionPane
										.showConfirmDialog(
												f,
												"Pressing 'Ok' will result in deleting all of your real HITs.",
												"Delete all real HITs?",
												JOptionPane.OK_CANCEL_OPTION) == JOptionPane.OK_OPTION) {
									onDeleteAllHITs("real");
								}
							} catch (Exception ee) {
								U.rethrow(ee);
							}
						}
					});
				}
				{
					JMenuItem mi = new JMenuItem("Export");
					m.add(mi);

					mi.addActionListener(new ActionListener() {
						public void actionPerformed(ActionEvent e) {
							try {
								export();
							} catch (Exception ee) {
								U.rethrow(ee);
							}
						}
					});
				}
			}
		}

		// toolbar
		JPanel toolbar = new JPanel(new BorderLayout());
		runControls = new RunControls(sem, f);
		JButton deleteDatabase = new JButton("Reset Database");
		deleteDatabase.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				try {
					onResetDatabase();
				} catch (Exception ee) {
					U.rethrow(ee);
				}
			}
		});
		JPanel toolbarCenter = new JPanel();
		{
			modeDropdown = new JComboBox(new String[] { "offline", "sandbox",
					"real" });
			toolbarCenter.add(modeDropdown);
			modeDropdown.setSelectedIndex(0);

			modeDropdown.addActionListener(new ActionListener() {
				public void actionPerformed(ActionEvent e) {
					String mode = (String) ((JComboBox) e.getSource())
							.getSelectedItem();
					try {
						propertiesPane.setMode(mode);
					} catch (Exception ee) {
						U.rethrow(ee);
					}
				}
			});
		}
		toolbarCenter.add(runControls);
		toolbar.add(toolbarCenter, BorderLayout.WEST);
		JPanel toolbarRight = new JPanel();
		toolbarRight.add(deleteDatabase);
		toolbar.add(toolbarRight, BorderLayout.EAST);

		f.getContentPane().add(toolbar, BorderLayout.NORTH);

		// dockables
		codePane = new CodePane(sem);
		propertiesPane = new PropertiesPane(sem);
		outputPane = new OutputPane(sem);
		databasePane = new DatabasePane(sem);
		hitsAndS3Pane = new HITsAndS3Pane(sem);

		codeDock = new DefaultDockable("input", codePane, "input", null,
				DockingMode.ALL);
		propertiesDock = new DefaultDockable("properties", propertiesPane,
				"properties", null, DockingMode.ALL);
		Dockable outputDock = new DefaultDockable("output", outputPane,
				"output", null, DockingMode.ALL);
		Dockable databaseDock = new DefaultDockable("database", databasePane,
				"database", null, DockingMode.ALL);
		Dockable hitsAndS3Dock = new DefaultDockable("HITs / S3",
				hitsAndS3Pane, "HITs / S3", null, DockingMode.ALL);

		leftTabDock = new TabDock();
		TabDock topTabDock = new TabDock();
		TabDock bottomTabDock = new TabDock();

		leftTabDock.addDockable(propertiesDock, new Position(1));
		leftTabDock.addDockable(codeDock, new Position(0));

		topTabDock.addDockable(outputDock, new Position(0));
		bottomTabDock.addDockable(databaseDock, new Position(1));
		bottomTabDock.addDockable(hitsAndS3Dock, new Position(0));

		SplitDock leftSplitDock = new SplitDock();
		leftSplitDock.addChildDock(leftTabDock, new Position(Position.CENTER));
		SplitDock topSplitDock = new SplitDock();
		topSplitDock.addChildDock(topTabDock, new Position(Position.CENTER));
		SplitDock bottomSplitDock = new SplitDock();
		bottomSplitDock.addChildDock(bottomTabDock, new Position(
				Position.CENTER));

		FloatDockModel dockModel = new FloatDockModel();
		dockModel.addOwner("frame0", f);
		DockingManager.setDockModel(dockModel);
		dockModel.addRootDock("leftdock", leftSplitDock, f);
		dockModel.addRootDock("topdock", topSplitDock, f);
		dockModel.addRootDock("bottomdock", bottomSplitDock, f);

		JSplitPane splitPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT);
		splitPane.setDividerLocation(400);
		JSplitPane rightSplitPane = new JSplitPane(JSplitPane.VERTICAL_SPLIT);
		rightSplitPane.setDividerLocation(300);

		splitPane.setLeftComponent(leftSplitDock);
		splitPane.setRightComponent(rightSplitPane);
		rightSplitPane.setLeftComponent(topSplitDock);
		rightSplitPane.setRightComponent(bottomSplitDock);

		f.getContentPane().add(splitPane, BorderLayout.CENTER);

		f.setSize(800, 600);

		{
			Timer filePoller = new Timer(1000, new ActionListener() {
				public void actionPerformed(ActionEvent arg0) {
					sem.fireEvent("reload", null, null);
				}
			});
			filePoller.start();
		}

		f.addWindowFocusListener(new WindowFocusListener() {

			public void windowGainedFocus(WindowEvent arg0) {
				sem.fireEvent("reload", null, null);
			}

			public void windowLostFocus(WindowEvent arg0) {
				// TODO Auto-generated method stub

			}
		});

		f.addWindowListener(new WindowAdapter() {
			public void windowClosing(WindowEvent e) {
				if (!(codePane.saved && propertiesPane.saved)) {
					int result = JOptionPane.showConfirmDialog(f,
							"Save before quitting?");
					if (result == JOptionPane.CANCEL_OPTION) {
						f
								.setDefaultCloseOperation(WindowConstants.DO_NOTHING_ON_CLOSE);
						SwingUtilities.invokeLater(new Runnable() {
							public void run() {
								U.exitOnClose(f);
							}
						});
					} else if (result == JOptionPane.YES_OPTION) {
						sem.fireEvent("save", null, null);
					}
				}
			}
		});

		// open a file, either the most recent, or a new file
		if (jsFile == null) {
			String recentFilename = (String) turkitProperties
					.queryRaw("ensure(null, 'recentFile', '')");
			if (!recentFilename.isEmpty()) {
				File f = new File(recentFilename);
				if (f.exists()) {
					openFile(f);
				}
			}
		}

		if (jsFile == null) {
			newFile();
		}
	}

	public void newFile() throws Exception {
		File dir = new File(".");
		if (jsFile != null) {
			dir = jsFile.getParentFile();
		}
		int i = 0;
		while (true) {
			String name = "code" + (i > 0 ? i : "") + ".js";
			File f = new File(dir.getAbsolutePath() + "/" + name);
			if (!f.exists()) {
				openFile(f);
				break;
			}
			i++;
		}
	}

	public void openFile(File jsFile) throws Exception {
		this.jsFile = jsFile;

		if (!jsFile.exists()) {
			U.save(jsFile, U.slurp(this.getClass().getResource(
					"default-file-contents.js")));
		}

		// save as most recent
		turkitProperties.query("recentFile = \""
				+ U.escapeString(jsFile.getAbsolutePath()) + "\"");

		// properties
		propertiesFile = new File(jsFile.getAbsolutePath() + ".properties");
		String defaultKey = "change_me";
		if (!propertiesFile.exists()) {
			String id = turkitProperties.queryRaw(
					"ensure(null, 'awsAccessKeyID', '" + defaultKey + "')")
					.toString();
			String secret = turkitProperties.queryRaw(
					"ensure(null, 'awsSecretAccessKey', 'change_me_too')")
					.toString();

			U.save(propertiesFile, U.slurp(
					this.getClass().getResource("default.properties"))
					.replaceAll("___MODE___", "sandbox").replaceAll("___ID___",
							id).replaceAll("___SECRET___", secret));
		}
		boolean showPropsPane = false;
		String mode = "offline";
		{
			Map props = PropertiesReader.read(U.slurp(propertiesFile), false);
			if (props != null) {
				mode = ((String) props.get("mode")).toLowerCase();
				if (props.get("awsAccessKeyID").toString().equals(defaultKey)) {
					showPropsPane = true;
				}
			} else {
				showPropsPane = true;
			}
		}

		if (showPropsPane) {
			sem.fireEvent("showProperties", null, null);
		}

		// create turkit
		turkit = new TurKit(jsFile, "", "", "offline");

		// dockables
		codePane.init(jsFile);
		propertiesPane.init(propertiesFile);
		databasePane.init(turkit);
		hitsAndS3Pane.init(turkit);

		for (int i = 0; i < modeDropdown.getItemCount(); i++) {
			if (((String) modeDropdown.getItemAt(i)).equalsIgnoreCase(mode)) {
				modeDropdown.setSelectedIndex(i);
			}
		}

		sem.fireEvent("updateDatabase", null, null);

		if (!f.isVisible())
			f.setVisible(true);
	}

	public void onNew() throws Exception {
		newFile();
	}

	public void onOpen() throws Exception {
		JFileChooser chooser = new JFileChooser();
		chooser.setFileFilter(new FileFilter() {
			@Override
			public boolean accept(File f) {
				return f.isDirectory() || f.getName().endsWith(".js");
			}

			@Override
			public String getDescription() {
				return "JavaScript Files";
			}
		});
		{
			String recentFilename = (String) turkitProperties
					.queryRaw("ensure(null, 'recentFile', '')");
			if (!recentFilename.isEmpty()) {
				File f = new File(recentFilename);
				if (f.exists()) {
					chooser.setCurrentDirectory(f);
				} else {
					f = f.getParentFile();
					if (f.exists()) {
						chooser.setCurrentDirectory(f);
					} else {
						chooser.setCurrentDirectory(new File("."));
					}
				}
			} else {
				chooser.setCurrentDirectory(new File("."));
			}
		}
		int returnVal = chooser.showOpenDialog(null);
		if (returnVal == JFileChooser.APPROVE_OPTION) {
			openFile(chooser.getSelectedFile());
		}
	}

	public void updateTitle() {
		f.setTitle(jsFile.getName()
				+ ((codePane.saved && propertiesPane.saved) ? "" : "*")
				+ "  -  TurKit " + turkit.version);
	}

	public void runInABit(long delaySeconds) {
		runAgainAtThisTime = System.currentTimeMillis() + (delaySeconds * 1000);
		updateRunPrompt();
	}

	public void onEvent(SimpleEvent e) throws Exception {
		if (e.name == "open") {
			onOpen();
		} else if (e.name == "new") {
			onNew();
		} else if (e.name == "run") {
			onRun(e.a == Boolean.TRUE);
		} else if (e.name == "save") {
			onStop();
		} else if (e.name == "updateTitle") {
			updateTitle();
		} else if (e.name == "showProperties") {
			showProperties();
		}
	}

	public void showProperties() {
		leftTabDock.setSelectedDockable(propertiesDock);
	}

	public Map<String, Object> reinitTurKit() throws Exception {
		Map props = PropertiesReader.read(U.slurp(propertiesFile), true);
		if (props == null) {
			turkitProperties.query("recentFile = \""
					+ U.escapeString(jsFile.getAbsolutePath()) + "\"");
			sem.fireEvent("stop", null, null);
			sem.fireEvent("showProperties", null, null);
			throw new Exception("error reading properties");
		}
		String awsAccessKeyID = (String) props.get("awsAccessKeyID");
		String awsSecretAccessKey = (String) props.get("awsSecretAccessKey");
		turkit.reinit(jsFile, awsAccessKeyID, awsSecretAccessKey,
				(String) props.get("mode"));

		turkitProperties.query("awsAccessKeyID = \""
				+ U.escapeString(awsAccessKeyID) + "\";"
				+ "awsSecretAccessKey = \""
				+ U.escapeString(awsSecretAccessKey) + "\";"
				+ "recentFile = \"" + U.escapeString(jsFile.getAbsolutePath())
				+ "\"");

		return props;
	}

	public void onRun(boolean repeat) throws Exception {
		sem.fireEvent("save", null, null);

		boolean done = false;
		Map m = null;

		outputPane.startCapture();
		try {
			m = reinitTurKit();
			done = turkit.runOnce((Double) m.get("maxMoney"), ((Double) m
					.get("maxHITs")).intValue());
			sem.fireEvent("updateDatabase", null, null);
		} catch (Throwable e) {
			System.out.println("ERROR: ----------------------------------");
			e.printStackTrace();
		} finally {
			outputPane.stopCapture();
		}

		if (repeat && !done && (m != null)) {
			Object o = m.get("repeatInterval");
			int delay = o != null ? (int) Math.ceil((Double) o) : 60;
			runInABit(delay);
		} else {
			sem.fireEvent("stop", null, null);
		}
	}

	public void onResetDatabase() throws Exception {
		sem.fireEvent("stop", null, null);

		outputPane.startCapture();
		try {
			reinitTurKit();
			turkit.resetDatabase(true);
			sem.fireEvent("updateDatabase", null, null);
			System.out
					.println("Done reseting database. (Backup database file created.)");
		} catch (Throwable e) {
			System.out.println("ERROR: ----------------------------------");
			e.printStackTrace();
		} finally {
			outputPane.stopCapture();
		}
	}

	public void onDeleteAllHITs(String mode) throws Exception {
		sem.fireEvent("stop", null, null);

		outputPane.startCapture();
		try {
			reinitTurKit();
			turkit.setMode(mode);
			turkit.deleteAllHITs();
			System.out.println("Done deleting all " + mode + " HITs.");
		} catch (Throwable e) {
			System.out.println("ERROR: ----------------------------------");
			e.printStackTrace();
		} finally {
			outputPane.stopCapture();
		}
	}

	public void onStop() {
		runAgainAtThisTime = -1;
		updateRunPrompt();
	}

	public void updateRunPrompt() {
		if (runAgainAtThisTime < 0) {
			runControls.runPrompt.setText("stopped");
		} else {
			long delta = runAgainAtThisTime - System.currentTimeMillis();
			if (delta <= 0) {
				runControls.runPrompt.setText("about to run again");
			} else {
				runControls.runPrompt
						.setText("will run again in "
								+ U.printf("%1.0f", (double) delta / 1000)
								+ " seconds");
			}
			if (timer != null) {
				timer.stop();
			}
			timer = new Timer((int) Math.max(Math.min(delta, 1000), 0),
					new ActionListener() {
						public void actionPerformed(ActionEvent arg0) {
							try {
								if (runAgainAtThisTime < 0) {
									updateRunPrompt();
								} else {
									long delta = runAgainAtThisTime
											- System.currentTimeMillis();
									if (delta <= 0) {
										onRun(true);
									} else {
										updateRunPrompt();
									}
								}
							} catch (Exception e) {
								// print this error to the output pane
								ByteArrayOutputStream out = new ByteArrayOutputStream();
								PrintStream ps = new PrintStream(out);
								e.printStackTrace(ps);
								ps.close();
								String s = out.toString();
								outputPane.setText("Unexpected Error:\n" + s);

								// let's press on
								runInABit(60);
							}
						}
					});
			timer.setRepeats(false);
			timer.start();
		}
	}

	public void listFileRecursively(File dir, Vector<File> dest) {
		for (File f : dir.listFiles()) {
			if (f.isDirectory()) {
				if (!f.getName().startsWith(".")
						&& !f.getName().startsWith("_")) {
					listFileRecursively(f, dest);
				}
			} else {
				if (!f.getName().equals("turkit.properties")
						&& !f.getName().matches("^.*\\.(zip|jar|old\\d*)$")) {
					dest.add(f);
				}
			}
		}
	}

	public void export() throws Exception {
		// get seed from user
		String seed = JOptionPane
				.showInputDialog("Please provide a seed to append to worker ids before hashing them:");

		// get a list of all the files we want to archive
		Vector<File> files = new Vector();
		listFileRecursively(jsFile.getParentFile(), files);

		// get a list of all the worker id's
		Map<String, String> workerIdMap = new HashMap();
		{
			turkit.database.consolidate();
			for (File f : files) {
				String s = U.slurp(f);
				Matcher m = Pattern.compile(
						"(?msi)^\\s*\"workerId\" ?: ?\"([A-Z0-9]+)\",?\\s*$")
						.matcher(s);
				while (m.find()) {
					workerIdMap.put(m.group(1), "FAKE_"
							+ U.md5(m.group(1) + seed).substring(0, 9)
									.toUpperCase());
				}
			}
		}

		// create the zip file
		{
			String name = jsFile.getAbsolutePath();
			name = name.substring(0, name.length() - 3) + ".zip";
			FileOutputStream o = new FileOutputStream(name);

			ZipOutputStream z = new ZipOutputStream(o);
			PrintStream p = new PrintStream(z);
			for (File f : files) {
				z
						.putNextEntry(new ZipEntry(
								f.getAbsolutePath()
										.substring(
												jsFile.getParentFile()
														.getAbsolutePath()
														.length() + 1)));

				if (f.getName().matches("^.*\\.js\\.properties$")) {
					p.print(U.slurp(
							this.getClass().getResource("default.properties"))
							.replaceAll("___MODE___", "offline").replaceAll(
									"___ID___", "not_exported").replaceAll(
									"___SECRET___", "not_exported"));
				} else {
					String s = U.slurp(f);
					String s_ = s;
					for (Map.Entry<String, String> e : workerIdMap.entrySet()) {
						s_ = s_.replaceAll(e.getKey(), e.getValue());
					}
					if (!s_.equals(s)) {
						// it contains some worker ids, so it's probably text,
						// and we want to write out the version with the fake
						// ids
						p.print(s_);
					} else {
						// it didn't have any worker ids, so it could be
						// anything,
						// so let's write it out byte for byte
						FileInputStream in = new FileInputStream(f);
						while (in.available() > 0) {
							p.write(in.read());
						}
					}
				}

				z.closeEntry();
			}
			z.close();
		}
	}
}
