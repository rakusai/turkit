package edu.mit.csail.uid.turkit.gui;

import java.awt.BorderLayout;
import java.awt.Font;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;
import java.io.File;

import javax.swing.JEditorPane;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;

import com.javadocking.dock.BorderDock;

import edu.mit.csail.uid.turkit.util.U;

public class CodePane extends JPanel implements SimpleEventListener {
	SimpleEventManager sem;
	JEditorPane text;
	public File file;
	public boolean saved = true;
	public long file_lastModified = -1;

	public void init(File file) throws Exception {
		this.file = file;
		file_lastModified = -1;
		reload();
	}

	public CodePane(SimpleEventManager _sem) throws Exception {
		this.sem = _sem;
		sem.addListener(this);

		Font font = new Font(Font.MONOSPACED, Font.PLAIN, 12);
		text = new JEditorPane();
		text.getDocument().addDocumentListener(new DocumentListener() {
			public void changedUpdate(DocumentEvent arg0) {
				onChange();
			}

			public void insertUpdate(DocumentEvent arg0) {
				onChange();
			}

			public void removeUpdate(DocumentEvent arg0) {
				onChange();
			}
		});
		text.addKeyListener(new KeyListener() {

			public void keyPressed(KeyEvent ke) {
				// TODO Auto-generated method stub
				if (ke.isControlDown() && (ke.getKeyCode() == KeyEvent.VK_S)) {
					sem.fireEvent("save", null, null);
				}
			}

			public void keyReleased(KeyEvent arg0) {
			}

			public void keyTyped(KeyEvent arg0) {
			}
		});
		text.setFont(font);

		setLayout(new BorderLayout());
		add(new JScrollPane(text));
	}

	public void onEvent(SimpleEvent e) throws Exception {
		if (file == null)
			return;

		if (e.name == "save") {
			if (!saved) {
				save();
			}
		} else if (e.name == "reload") {
			reload();
		}
	}

	public void save() throws Exception {
		U.saveString(file, text.getText());
		file_lastModified = file.lastModified();
		saved = true;
		sem.pushEvent("updateTitle", this, null);
	}

	public void reload() throws Exception {
		if (saved) {
			long a = file.lastModified();
			if (a > file_lastModified) {
				sem.fireEvent("stop", null, null);

				text.setText(U.slurp(file));
				saved = true;

				sem.pushEvent("updateTitle", this, null);
				file_lastModified = a;
			}
		}
	}

	public void onChange() {
		saved = false;
		sem.fireEvent("stop", null, null);
		sem.pushEvent("updateTitle", this, null);
	}
}
