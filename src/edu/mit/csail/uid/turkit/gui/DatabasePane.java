package edu.mit.csail.uid.turkit.gui;

import java.awt.BorderLayout;
import java.awt.Font;

import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;

import edu.mit.csail.uid.turkit.TurKit;
import edu.mit.csail.uid.turkit.util.U;

public class DatabasePane extends JPanel implements SimpleEventListener {
	SimpleEventManager sem;
	JTextArea text;
	TurKit turkit;

	public void init(TurKit turkit) {
		this.turkit = turkit;
	}
	
	public DatabasePane(SimpleEventManager _sem) throws Exception {
		this.sem = _sem;
		sem.addListener(this);

		text = new JTextArea();
		text.setEditable(false);
		Font font = new Font(Font.MONOSPACED, Font.PLAIN, 12);
		text.setFont(font);

		setLayout(new BorderLayout());
		add(new JScrollPane(text));
	}

	public void onEvent(SimpleEvent e) throws Exception {
		if (e.name == "updateDatabase") {
			turkit.database.consolidate();
			text.setText(U.slurp(turkit.database.storageFile));
		}
	}
}
