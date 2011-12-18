package edu.mit.csail.uid.turkit.util;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintStream;

public class WireTap {
	ByteArrayOutputStream stream = new ByteArrayOutputStream();
	PrintStream printStream;
	PrintStream realOut;
	PrintStream realErr;

	class Tapper extends OutputStream {
		PrintStream realStream;
		PrintStream fakeStream;

		public Tapper(PrintStream realStream, PrintStream fakeStream) {
			this.realStream = realStream;
			this.fakeStream = fakeStream;
		}

		@Override
		public void close() {
			realStream.close();
		}

		@Override
		public void flush() {
			realStream.flush();
		}

		@Override
		public void write(int b) throws IOException {
			realStream.write(b);
			fakeStream.write(b);
		}
	}

	public WireTap() {
		realOut = System.out;
		realErr = System.err;
		printStream = new PrintStream(stream, true);
		System.setOut(new PrintStream(new Tapper(realOut, printStream)));
		System.setErr(new PrintStream(new Tapper(realErr, printStream)));
	}

	public String close() {
		printStream.flush();
		printStream.close();
		System.setOut(realOut);
		System.setErr(realErr);
		return stream.toString();
	}
}
