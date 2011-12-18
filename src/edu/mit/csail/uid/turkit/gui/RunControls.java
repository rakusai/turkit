package edu.mit.csail.uid.turkit.gui;

import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.KeyEvent;

import javax.swing.AbstractAction;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.KeyStroke;

public class RunControls extends JPanel implements SimpleEventListener {
	SimpleEventManager sem;

	public JLabel runPrompt;

	public RunControls(SimpleEventManager _sem, JFrame f) {
		this.sem = _sem;
		sem.addListener(this);

		{
			JButton b = new JButton("Stop");
			b.addActionListener(f.getRootPane().getActionMap().get("save"));
			add(b);

			b.setDisplayedMnemonicIndex(0);
			b.setToolTipText("Ctrl-S");
		}
		{
			JButton b = new JButton("Run");
			b.addActionListener(f.getRootPane().getActionMap().get("run"));
			add(b);

			b.setDisplayedMnemonicIndex(0);
			b.setToolTipText("Ctrl-R");
			f.getRootPane().getInputMap(WHEN_IN_FOCUSED_WINDOW)
					.put(
							KeyStroke.getKeyStroke(KeyEvent.VK_R,
									ActionEvent.CTRL_MASK), "run");
		}
		{
			JButton b = new JButton("Run Repeatedly");
			b.addActionListener(f.getRootPane().getActionMap()
					.get("run-repeat"));
			add(b);

			b.setToolTipText("Ctrl-Shift-R");
			f.getRootPane().getInputMap(WHEN_IN_FOCUSED_WINDOW).put(
					KeyStroke.getKeyStroke(KeyEvent.VK_R, ActionEvent.CTRL_MASK
							| ActionEvent.SHIFT_MASK), "run-repeat");
		}

		runPrompt = new JLabel();
		add(runPrompt);
	}

	public void onEvent(SimpleEvent e) {
	}
}
