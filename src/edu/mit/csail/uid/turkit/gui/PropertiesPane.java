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

public class PropertiesPane extends CodePane {

	public PropertiesPane(SimpleEventManager _sem) throws Exception {
		super(_sem);
	}

	public void setMode(String mode) throws Exception {
		if (file == null)
			return;

		reload();
		String s = text.getText();
		s = s.replaceFirst("(?m)^mode\\s+=(.*)$", "mode = " + mode);
		text.setText(s);
		save();
	}
}
