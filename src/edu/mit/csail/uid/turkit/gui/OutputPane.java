package edu.mit.csail.uid.turkit.gui;

import java.awt.BorderLayout;
import java.awt.Font;

import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;

import edu.mit.csail.uid.turkit.util.WireTap;

public class OutputPane extends JPanel implements SimpleEventListener {
	SimpleEventManager sem;
	JTextArea text;
	WireTap wireTap;

	public OutputPane(SimpleEventManager _sem) throws Exception {
		this.sem = _sem;
		sem.addListener(this);

		text = new JTextArea();
		text.setEditable(false);
		Font font = new Font(Font.MONOSPACED, Font.PLAIN, 12);
		text.setFont(font);

		setLayout(new BorderLayout());
		add(new JScrollPane(text));
	}
	
	public void startCapture() {
		wireTap = new WireTap();
	}
	
	public void stopCapture() {
		text.setText(wireTap.close());
		wireTap = null;
	}
	
	public void setText(String text) {
		this.text.setText(text);
	}

	public void onEvent(SimpleEvent e) throws Exception {
	}
}
